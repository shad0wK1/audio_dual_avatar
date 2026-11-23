"""Short spoken prompts used while a web answer is being generated."""
import hashlib
from contextlib import aclosing
from pathlib import Path

PROMPTS = (
    "好的，请稍等片刻，我来帮您查询一下相关的信息。",
    "嗯，请您稍等一会儿，我来查一查有关的信息。",
    "好的，请您稍等一下，我帮您核实确认一下。",
    "我来帮您查询一下相关信息，请您稍等片刻。",
)


def clip_path(model, voice, text):
    key = hashlib.sha256("\n".join((model, voice, text)).encode()).hexdigest()
    return Path(__file__).with_name("search_audio") / (key + ".pcm")


async def audio_chunks(providers, voice, text):
    path = clip_path(providers.config["QWEN_TTS_MODEL"], voice, text)
    try:
        pcm = path.read_bytes()
    except FileNotFoundError:
        # Newly configured voices can speak immediately using their own TTS.
        async with aclosing(providers.synthesize(text, voice)) as chunks:
            async for chunk in chunks:
                yield chunk
    else:
        yield pcm
