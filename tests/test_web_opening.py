import asyncio
import base64
import unittest

from cloud.history import Turn
from cloud.playback import stream_answer
from cloud.search_opening import PROMPTS


class ControlledProviders:
    config = {"QWEN_TTS_MODEL": "test"}

    def __init__(self, web):
        self.web = web
        self.search_started = asyncio.Event()
        self.allow_answer = asyncio.Event()
        self.search_closed = asyncio.Event()
        self.routes = 0

    async def choose_web(self, context):
        self.routes += 1
        return self.web, "deepseek_web" if self.web else "deepseek_direct"

    async def sentences(self, context, reply_metadata, *, route):
        self.search_started.set()
        try:
            await self.allow_answer.wait()
            yield "正式回答。"
        finally:
            self.search_closed.set()

    async def synthesize(self, text, voice):
        yield b"\x20\x02" * (3600 if text in PROMPTS else 2400)


class OpeningTest(unittest.IsolatedAsyncioTestCase):
    async def test_order_and_interruption(self):
        for web, interrupt in [(True, False), (False, False), (True, True)]:
            with self.subTest(web=web, interrupt=interrupt):
                p = ControlledProviders(web)
                turn = Turn("test", None)
                output = []
                boundaries = []
                opening_heard = asyncio.Event()

                async def emit(kind, **fields):
                    if kind == "text":
                        output.append(fields["text"])
                    else:
                        output.append(len(base64.b64decode(fields["audio"])) // 4)
                        if fields.get("opening_end"):
                            boundaries.append(len(output))
                        opening_heard.set()

                task = asyncio.create_task(stream_answer(p, [], "test", emit, turn.phrases, {}))
                await asyncio.wait_for(p.search_started.wait(), 2)
                if web:
                    await asyncio.wait_for(opening_heard.wait(), 2)
                    self.assertIn(output[0], PROMPTS)
                    self.assertEqual(output[1:], [3600])
                else:
                    self.assertEqual(output, [])
                self.assertEqual(p.routes, 1)
                if interrupt:
                    task.cancel()
                    with self.assertRaises(asyncio.CancelledError):
                        await task
                    turn.clip(3000, None, None)
                    self.assertEqual(turn.answer, "")
                    self.assertIsNone(turn.partial)
                    self.assertEqual(len(output), 2)
                else:
                    p.allow_answer.set()
                    turn.answer = await asyncio.wait_for(task, 2)
                    self.assertEqual(turn.answer, "正式回答。")
                    self.assertEqual(output[2:] if web else output, ["正式回答。", 2400])
                    turn.clip(6000 if web else 2400, None, None)
                    self.assertEqual(turn.answer, "正式回答。")
                self.assertEqual(boundaries, [2] if web else [])
                self.assertTrue(p.search_closed.is_set())
