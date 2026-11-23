"""Session-local conversation history at the browser's output boundary."""
import asyncio
import logging
import unicodedata
from dataclasses import dataclass, field
from difflib import SequenceMatcher

import httpx
import numpy as np

from .providers import ProviderError

logger = logging.getLogger("uvicorn.error")


def spoken_prefix(text, transcript):
    """Only return original words corroborated by ASR on the played recording."""
    def significant(value):
        return not value.isspace() and not unicodedata.category(value).startswith("P")

    # ASR can transcribe names as homophones. Permit short local differences
    # only when later audible words establish where the original text resumes.
    positions = [i for i, c in enumerate(text) if significant(c)]
    source = [text[i].casefold() for i in positions]
    heard = [c.casefold() for c in transcript if significant(c)]
    end = 0
    while end < min(len(source), len(heard)) and source[end] == heard[end]:
        end += 1
    src = rec = end
    blocks = SequenceMatcher(None, source[end:len(heard) + 4], heard[end:], autojunk=False)
    base = end
    for match in blocks.get_matching_blocks():
        if match.size < 2:
            continue
        i, j = base + match.a, base + match.b
        if max(i - src, j - rec) > 3:
            break
        src, rec = i + match.size, j + match.size
        end = src
    return text[:positions[end - 1] + 1] if end else ""


@dataclass
class Phrase:
    text: str
    pcm: bytearray = field(default_factory=bytearray)
    complete: bool = False


class Turn:
    def __init__(self, response_id, question):
        self.response_id = response_id
        self.question = question
        self.phrases = []
        self.answer = ""
        self.reply_metadata = {}
        self.clipped = False
        self.partial = None

    def clip(self, played_samples, recognize, spawn):
        if self.clipped:
            return
        self.clipped = True
        phrases, self.phrases = self.phrases, []
        completed_answer = self.answer
        self.answer = ""
        for phrase in phrases:
            samples = len(phrase.pcm) // 2
            if phrase.complete and samples and played_samples >= samples:
                self.answer += phrase.text
                played_samples -= samples
                continue
            pcm = bytes(phrase.pcm[:played_samples * 2])
            if phrase.text and len(pcm) >= 2400 and np.max(np.abs(np.frombuffer(pcm, "<i2").astype("i4"))) >= 160:
                self.partial = spawn(self._recognize_prefix(recognize, pcm, phrase.text))
            break
        if not completed_answer or self.answer != completed_answer or self.partial is not None:
            # Hidden search results and reasoning could reveal the unplayed ending.
            self.reply_metadata.clear()

    async def _recognize_prefix(self, recognize, pcm, text):
        try:
            transcript = await recognize(pcm, sample_rate=24000)
            return spoken_prefix(text, transcript)
        except (ProviderError, httpx.HTTPError, ValueError, KeyError, IndexError, TypeError) as exc:
            logger.warning("Interrupted phrase ASR unavailable: %s", type(exc).__name__)
            return ""

    async def messages(self):
        user = await asyncio.shield(self.question)
        if not user:
            return []
        messages = [{"role": "user", "content": user}]
        answer = self.answer
        if self.partial is not None:
            answer += await asyncio.shield(self.partial)
        if answer:
            messages.append({"role": "assistant", "content": answer,
                             "reasoning_content": "", **self.reply_metadata})
        return messages
