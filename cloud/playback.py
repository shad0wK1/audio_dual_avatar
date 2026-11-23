"""Keep cloud synthesis a few seconds ahead of the paced avatar audio bridge."""
import asyncio
import random
from contextlib import aclosing

import numpy as np
import base64

from time import monotonic
from . import search_opening
from .history import Phrase
from .providers import log_stage


async def stream_answer(providers, context, voice, emit, phrases=None, reply_metadata=None):
    route = await providers.choose_web(context)
    texts = asyncio.Queue(maxsize=4)
    # PCM16 mono at 24 kHz. Each item holds at most 250 ms.
    audio = asyncio.Queue(maxsize=12)
    answer = []

    async def read_text():
        async with aclosing(providers.sentences(context, reply_metadata, route=route)) as sentences:
            async for sentence in sentences:
                await texts.put(sentence)
        await texts.put(None)

    async def enqueue_phrase(text, chunks, *, history_text, first_stage=None, opening=False):
        phrase = Phrase(history_text) if phrases is not None else None
        if phrase is not None:
            phrases.append(phrase)
        await audio.put(text)
        pending = None
        started = monotonic()
        async with aclosing(chunks):
            async for chunk in chunks:
                if first_stage:
                    log_stage(first_stage, started)
                    first_stage = None
                if phrase is not None:
                    phrase.pcm.extend(chunk)
                for offset in range(0, len(chunk), 12000):
                    piece = chunk[offset:offset + 12000]
                    if opening:
                        if pending is not None:
                            await audio.put((pending, False))
                        pending = piece
                    else:
                        await audio.put((piece, None))
        if pending is not None:
            await audio.put((pending, True))
        if phrase is not None:
            phrase.complete = True

    async def synthesize():
        if route[0]:
            opening = random.choice(search_opening.PROMPTS)
            # Count the opening in the playback cursor, but omit it from model history.
            await enqueue_phrase(opening, search_opening.audio_chunks(providers, voice, opening),
                                 history_text="", first_stage="web_opening_first_pcm", opening=True)
        sentence = await texts.get()
        while sentence is not None:
            # Join short phrases that DeepSeek has already supplied, without
            # delaying the first phrase or waiting for more text to arrive.
            ended = False
            while answer and len(sentence) < 60 and not texts.empty():
                extra = texts.get_nowait()
                if extra is None:
                    ended = True
                    break
                sentence += extra
            await enqueue_phrase(sentence, providers.synthesize(sentence, voice), history_text=sentence,
                                 first_stage="tts_first_pcm" if not answer else None)
            answer.append(sentence)
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
            pcm, opening_end = item
            # Send the short opening ahead, so all its windows are ready even
            # on a fast renderer. The bridge and viewer still pace playback.
            if opening_end is None:
                await asyncio.sleep(max(0, due - loop.time() - 1.25))
            samples = np.frombuffer(pcm, dtype="<i2")
            data = (samples.astype("<f4") / 32768).tobytes()
            fields = {"audio": base64.b64encode(data).decode()}
            if opening_end:
                fields["opening_end"] = True
            await emit("audio", **fields)
            due = max(loop.time(), due) + len(samples) / 24000

    tasks = [asyncio.create_task(fn()) for fn in (read_text, synthesize, play)]
    try:
        await asyncio.gather(*tasks)
    finally:
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
    return "".join(answer)
