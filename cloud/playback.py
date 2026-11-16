"""Keep cloud synthesis a few seconds ahead of the paced avatar audio bridge."""
import asyncio
from contextlib import aclosing

import numpy as np
import base64

from time import monotonic
from .history import Phrase
from .providers import log_stage


async def stream_answer(providers, context, voice, emit, phrases=None, reply_metadata=None):
    texts = asyncio.Queue(maxsize=4)
    # PCM16 mono at 24 kHz. Each item holds at most 250 ms.
    audio = asyncio.Queue(maxsize=12)
    answer = []

    async def read_text():
        async with aclosing(providers.sentences(context, reply_metadata)) as sentences:
            async for sentence in sentences:
                await texts.put(sentence)
        await texts.put(None)

    async def synthesize():
        sentence = await texts.get()
        first = True
        while sentence is not None:
            # Join short phrases that DeepSeek has already supplied, without
            # delaying the first phrase or waiting for more text to arrive.
            ended = False
            while not first and len(sentence) < 60 and not texts.empty():
                extra = texts.get_nowait()
                if extra is None:
                    ended = True
                    break
                sentence += extra
            phrase = Phrase(sentence) if phrases is not None else None
            if phrase is not None:
                phrases.append(phrase)
            answer.append(sentence)
            await audio.put(sentence)
            tts_started = monotonic()
            async with aclosing(providers.synthesize(sentence, voice)) as chunks:
                async for chunk in chunks:
                    if first:
                        log_stage("tts_first_pcm", tts_started)
                        first = False
                    if phrase is not None:
                        phrase.pcm.extend(chunk)
                    for offset in range(0, len(chunk), 12000):
                        await audio.put(chunk[offset:offset+12000])
            if phrase is not None:
                phrase.complete = True
            sentence = None if ended else await texts.get()
        await audio.put(None)

    async def play():
        loop = asyncio.get_running_loop()
        due = loop.time()
        while True:
            item = await audio.get()
            if item is None:
                return
            if isinstance(item, str):
                await emit("text", text=item)
                continue
            await asyncio.sleep(max(0, due - loop.time() - 1.25))
            samples = np.frombuffer(item, dtype="<i2")
            data = (samples.astype("<f4") / 32768).tobytes()
            await emit("audio", audio=base64.b64encode(data).decode())
            due = max(loop.time(), due) + len(samples) / 24000

    tasks = [asyncio.create_task(fn()) for fn in (read_text, synthesize, play)]
    try:
        await asyncio.gather(*tasks)
    finally:
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
    return "".join(answer)
