import asyncio
import base64
import logging
import uuid
from collections import deque
from contextlib import suppress
from time import monotonic

import httpx
import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect

from .history import Turn
from .playback import stream_answer
from .providers import Providers, ProviderError, settings, log_stage, response_log_id

app = FastAPI()
logger = logging.getLogger("uvicorn.error")
active = False
FRAME = 320  # 20 ms at 16 kHz
END_SILENCE_FRAMES = 40  # 800 ms allows a short pause within a sentence.

SPOKEN_REPLY_FORMAT = """你的回答会直接交给语音合成引擎实时朗读，面向听众的最终输出必须严格遵守以下规范：

只输出可以直接念出来的纯文本自然段，只能用7种点号（句号。 问号？ 叹号！ 逗号， 顿号、 分号； 冒号：）表达停顿，禁止输出其他标点符号（像GPT-3要输出为GPT3）。严禁输出 Markdown、HTML、代码块、表格、括号注释以及 Emoji 表情。

保持全双工实时对话节奏：单句尽量不超过 20 个字，第一句话简短直接,每次回答尽量在 5 到 6 句话内讲清重点，内容复杂时先给结论，再问用户是否需要展开；遇到没说完的半句输入，用简短语气词自然承接。

回答尽量专业、准确，先讲结论，再用清晰流畅的语言交代必要的依据或适用条件。用准术语，必要时解释；数字说清单位，时效信息标明日期和来源。区分事实、估计和建议，证据不足时承认不确定。"""


class Utterances:
    def __init__(self):
        self.remainder = np.empty(0, dtype="<f4")
        self.lead = deque(maxlen=10)
        self.frames = []
        self.voiced = self.quiet = 0

    def reset_for_interrupt(self):
        # The detector can hear the first 180 ms of a new word before the
        # interrupt reaches us. Keep this short prefix for the next utterance.
        if self.frames:
            self.lead.clear()
            self.lead.extend(self.frames[-self.lead.maxlen:])
        self.frames.clear()
        self.voiced = self.quiet = 0

    def feed(self, samples):
        audio = np.concatenate((self.remainder, samples))
        end = len(audio) // FRAME * FRAME
        self.remainder = audio[end:].copy()
        for frame in audio[:end].reshape(-1, FRAME):
            voiced = np.mean(frame ** 2) >= 0.009 ** 2
            pcm = (np.clip(frame, -1, 1) * 32767).astype("<i2").tobytes()
            if not self.frames:
                if not voiced:
                    self.lead.append(pcm)
                    continue
                self.frames.extend(self.lead)
                self.lead.clear()
            self.frames.append(pcm)
            self.voiced += int(voiced)
            self.quiet = 0 if voiced else self.quiet + 1
            if self.quiet >= END_SILENCE_FRAMES or len(self.frames) >= 1500:
                result = b"".join(self.frames) if self.voiced >= 5 else None
                self.frames.clear()
                self.voiced = self.quiet = 0
                if result:
                    yield result


class Conversation:
    def __init__(self, providers, send, prompt, voice):
        self.providers = providers
        self.send = send
        self.prompt = f"{prompt}\n\n{SPOKEN_REPLY_FORMAT}"
        self.voice = voice
        self.history = deque(maxlen=11)  # Ten previous turns plus the current question.
        self.background = set()
        self.task = None
        self.pending = deque()
        self.vad = Utterances()
        self.generation = "0"

    def spawn(self, coro):
        task = asyncio.create_task(coro)
        self.background.add(task)
        task.add_done_callback(self.background.discard)
        return task

    async def recognize_question(self, pcm, response_id):
        response_log_id.set(response_id)
        started = monotonic()
        try:
            result = await self.providers.recognize(pcm)
            log_stage("asr", started)
            return result
        except (ProviderError, httpx.HTTPError, ValueError, KeyError, IndexError, TypeError) as exc:
            logger.warning("Question ASR failed: %s", type(exc).__name__)
            await self.send({"type": "error", "code": "cloud_provider_error",
                             "message": "语音识别失败，请再说一次"})
            return ""

    async def close(self):
        await self.cancel_reply()
        tasks = list(self.background)
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)

    async def interrupt(self, playback):
        await self.cancel_reply()
        # A legacy client has no output cursor. Keep its completed turns.
        if not isinstance(playback, dict):
            return
        for turn in self.history:
            samples = playback.get(turn.response_id, 0)
            if type(samples) is int and 0 <= samples <= 24000 * 3600:
                turn.clip(samples, self.providers.recognize, self.spawn)

    async def cancel_reply(self):
        self.history.extend(turn for turn, _ in self.pending)
        self.pending.clear()
        if self.task:
            self.task.cancel()
            with suppress(asyncio.CancelledError):
                await self.task
            self.task = None

    async def append(self, payload):
        input_id = str(payload["input_id"])
        generation = input_id.split(":", 1)[0]
        if generation != self.generation:
            await self.cancel_reply()
            self.vad.reset_for_interrupt()
            self.generation = generation
        raw = base64.b64decode(payload["audio"], validate=True)
        samples = np.frombuffer(raw, dtype="<f4")
        if len(samples) > 16000 * 5 or not np.isfinite(samples).all():
            raise ValueError("invalid input audio")
        for utterance in self.vad.feed(samples):
            if len(self.pending) >= 8:
                raise ValueError("语音队列已满，请重新开始会话")
            response_id = "resp_" + uuid.uuid4().hex
            turn = Turn(response_id, self.spawn(self.recognize_question(utterance, response_id)))
            self.pending.append((turn, input_id))
            if self.task is None or self.task.done():
                self.task = asyncio.create_task(self._answer_pending())

    async def _answer_pending(self):
        while self.pending:
            turn, input_id = self.pending.popleft()
            self.history.append(turn)
            await self.reply(turn, input_id)

    async def reply(self, turn, input_id):
        response_id = turn.response_id
        response_log_id.set(response_id)
        async def emit(kind, **fields):
            await self.send({"type": "response.output.delta", "response_id": response_id,
                             "input_id": input_id, "kind": kind, **fields})
        try:
            if not await asyncio.shield(turn.question):
                return
            context = [{"role": "system", "content": self.prompt}]
            for previous in list(self.history):
                context.extend(await previous.messages())
            answer = await stream_answer(self.providers, context, self.voice, emit,
                                         turn.phrases, turn.reply_metadata)
            if not answer:
                raise ProviderError("DeepSeek 返回空回答")
            turn.answer = answer
            await emit("listen")
        except (ProviderError, httpx.HTTPError, ValueError, KeyError, IndexError, TypeError) as exc:
            detail = str(exc) if isinstance(exc, ProviderError) else type(exc).__name__
            logger.warning("Cloud speech pipeline failed: %s", detail)
            await self.send({"type": "error", "code": "cloud_provider_error", "message": detail})


@app.get("/health")
async def health():
    return {"worker_status": "duplex_active" if active else "idle", "capabilities": ["audio_duplex"]}


@app.websocket("/v1/worker/duplex")
async def duplex(ws: WebSocket):
    global active
    await ws.accept()
    if active:
        await ws.close(code=1013)
        return
    active = True
    conversation = None
    try:
        config = settings()
        first = await ws.receive_json()
        if first.get("type") != "session.init":
            raise ValueError("session.init required")
        init = first["payload"]
        voice = config.get("VOICE_" + init["preset_id"].upper(), config["VOICE_GRIL_V2"])
        async with httpx.AsyncClient(timeout=httpx.Timeout(40, connect=8)) as client:
            conversation = Conversation(Providers(config, client), ws.send_json, init["system_prompt"], voice)
            try:
                await ws.send_json({"type": "session.created", "session_id": uuid.uuid4().hex})
                while True:
                    msg = await ws.receive_json()
                    if msg["type"] == "session.close":
                        await conversation.cancel_reply()
                        await ws.send_json({"type": "session.closed", "reason": "client_closed"})
                        break
                    if msg["type"] == "input.interrupt":
                        await conversation.interrupt(msg.get("playback"))
                        conversation.vad.reset_for_interrupt()
                    elif msg["type"] == "input.append":
                        await conversation.append(msg["input"])
            finally:
                await conversation.close()
    except WebSocketDisconnect:
        pass
    except (ValueError, KeyError, TypeError) as exc:
        await ws.send_json({"type": "error", "code": "invalid_session", "message": str(exc)})
    finally:
        active = False
