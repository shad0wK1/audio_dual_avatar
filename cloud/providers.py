"""Speech recognition and synthesis on DashScope, response text on DeepSeek."""
import asyncio
import base64
import io
import json
import logging
from contextvars import ContextVar
from contextlib import aclosing
from . import routing
from time import monotonic
import struct
import wave
from pathlib import Path

import httpx
from dotenv import dotenv_values

ROOT = Path(__file__).resolve().parents[1]


def settings():
    config = dotenv_values(ROOT / ".env", interpolate=False)
    missing = [key for key in ("DASHSCOPE_API_KEY", "DEEPSEEK_API_KEY")
               if not (config.get(key) or "").strip()]
    if missing:
        raise ValueError(f"请填写 {ROOT}/.env 中的 " + "、".join(missing))
    for key in ("DASHSCOPE_BASE_URL", "DEEPSEEK_BASE_URL"):
        url = httpx.URL(config[key])
        if url.scheme != "https" or not url.host or url.username or url.password:
            raise ValueError(f"{key} 应为 HTTPS 服务地址")
    return config


response_log_id = ContextVar("response_log_id", default="-")
logger = logging.getLogger("uvicorn.error")


def log_stage(stage, started):
    logger.info("avatar_latency response=%s stage=%s elapsed_ms=%d",
                response_log_id.get(), stage, round((monotonic() - started) * 1000))


class ProviderError(RuntimeError):
    pass


class TtsPcmStream:
    """Extract PCM from a DashScope WAV stream, including split SSE chunks."""
    def __init__(self):
        self.header = bytearray()
        self.tail = b""
        self.remaining = None

    def _payload_offset(self):
        buf = self.header
        if len(buf) < 4:
            return None
        if buf[:4] != b"RIFF":
            return 0  # Raw PCM from a provider without a WAV wrapper.
        if len(buf) < 12:
            return None
        if buf[8:12] != b"WAVE":
            raise ProviderError("Qwen TTS WAV 文件头无效")
        offset = 12
        valid_format = False
        while offset + 8 <= len(buf):
            tag, size = struct.unpack_from("<4sI", buf, offset)
            offset += 8
            if tag == b"data":
                if not valid_format:
                    raise ProviderError("Qwen TTS WAV 缺少 fmt 块")
                # DashScope uses a placeholder size for streaming synthesis.
                self.remaining = None if size in (0x7fffff9b, 0xffffffff) else size
                return offset
            if offset + size + (size % 2) > 65536:
                raise ProviderError("Qwen TTS WAV 文件头过长")
            if len(buf) < offset + size + (size % 2):
                return None
            if tag == b"fmt ":
                if size < 16 or struct.unpack_from("<HHIIHH", buf, offset) != (1, 1, 24000, 48000, 2, 16):
                    raise ProviderError("Qwen TTS 需要 24 kHz 单声道 PCM16 WAV")
                valid_format = True
            offset += size + (size % 2)
        return None

    def feed(self, data):
        if self.header is not None:
            self.header.extend(data)
            offset = self._payload_offset()
            if offset is None:
                return b""
            data = bytes(self.header[offset:])
            self.header = None
        if self.remaining is not None:
            data = data[:self.remaining]
            self.remaining -= len(data)
        data = self.tail + data
        end = len(data) - len(data) % 2
        self.tail = data[end:]
        return data[:end]

    def finish(self):
        if self.header is not None or self.tail or self.remaining:
            raise ProviderError("Qwen TTS 音频数据不完整")


def auth(key):
    return {"Authorization": "Bearer " + key}


def check(response, stage):
    if response.status_code != 200:
        raise ProviderError(f"{stage} HTTP {response.status_code}")


async def events(response, stage):
    async for line in response.aiter_lines():
        if line.startswith("event:") and line[6:].strip() == "error":
            raise ProviderError(f"{stage} 返回错误事件")
        if not line.startswith("data:"):
            continue
        data = line[5:].strip()
        if data == "[DONE]":
            return
        payload = json.loads(data)
        if payload.get("error") or payload.get("code"):
            raise ProviderError(f"{stage} 返回错误")
        yield payload


class Providers:
    def __init__(self, config, client):
        self.config = config
        self.client = client
        self.qwen = config["DASHSCOPE_BASE_URL"].rstrip("/")
        self.deepseek = config["DEEPSEEK_BASE_URL"].rstrip("/")
        self.qwen_headers = auth(config["DASHSCOPE_API_KEY"])

    async def recognize(self, pcm, sample_rate=16000):
        buffer = io.BytesIO()
        with wave.open(buffer, "wb") as wav:
            wav.setparams((1, 2, sample_rate, 0, "NONE", "not compressed"))
            wav.writeframes(pcm)
        uri = "data:audio/wav;base64," + base64.b64encode(buffer.getvalue()).decode()
        response = await self.client.post(
            self.qwen + "/compatible-mode/v1/chat/completions",
            headers=self.qwen_headers,
            json={"model": self.config["QWEN_ASR_MODEL"], "stream": False,
                  "messages": [{"role": "user", "content": [
                      {"type": "input_audio", "input_audio": {"data": uri}}]}],
                  "asr_options": {"enable_itn": True}},
        )
        check(response, "Qwen ASR")
        return response.json()["choices"][0]["message"]["content"].strip()

    async def sentences(self, messages, reply_metadata=None):
        web, allow_web = routing.search_options(messages)
        can_request_search = allow_web and not web
        routed = messages
        if can_request_search:
            if messages and messages[0]["role"] == "system":
                routed = [{**messages[0], "content": messages[0]["content"] + "\n" + routing.SEARCH_HINT}, *messages[1:]]
            else:
                routed = [{"role": "system", "content": routing.SEARCH_HINT}, *messages]
        async with aclosing(self._sentences(routed, reply_metadata, web)) as stream:
            first = await anext(stream, "")
            if not can_request_search or first.strip() != "[WEB]":
                if first:
                    yield first
                async for sentence in stream:
                    yield sentence
                return
        if reply_metadata is not None:
            reply_metadata.clear()
        async with aclosing(self._sentences(messages, reply_metadata, web=True)) as stream:
            async for sentence in stream:
                yield sentence

    async def _sentences(self, messages, reply_metadata, web):
        logger.info("avatar_route response=%s thinking=low search_available=%s",
                    response_log_id.get(), web)
        body = {
            "model": self.config["DEEPSEEK_MODEL"],
            "messages": messages,
            "stream": True,
            "thinking": {"type": "enabled"},
            "reasoning_effort": "low",
            "max_tokens": 8192,
        }
        if web:
            body["tools"] = [{"type": "deepseek_web_search"}]
        final_reasoning = []
        original_text = []
        started = monotonic()
        first_clause = True
        logged_reasoning = logged_content = False
        async with self.client.stream("POST", self.deepseek + "/chat/completions",
                                      headers=auth(self.config["DEEPSEEK_API_KEY"]), json=body,
                                      timeout=httpx.Timeout(120, connect=8)) as response:
            check(response, "DeepSeek")
            pending = ""
            finished = False
            async for event in events(response, "DeepSeek"):
                for choice in event.get("choices", []):
                    delta = choice.get("delta") or {}
                    tool_event = choice.get("server_tool_event") or {}
                    if tool_event.get("type") in ("call_started", "call_completed"):
                        log_stage("search_" + tool_event["type"], started)
                    if delta.get("reasoning_content"):
                        if not logged_reasoning:
                            log_stage("deepseek_first_reasoning", started)
                            logged_reasoning = True
                        final_reasoning.append(delta["reasoning_content"])
                    if (choice.get("server_tool_event") or {}).get("type") == "step_reasoning_done":
                        final_reasoning.clear()
                    content = delta.get("content") or ""
                    if content and not logged_content:
                        log_stage("deepseek_first_text", started)
                        logged_content = True
                    original_text.append(content)
                    reason = choice.get("finish_reason")
                    if reason and reason != "stop":
                        raise ProviderError(f"DeepSeek 回答未完成 ({reason})")
                    if reason == "stop":
                        finished = True
                        if reply_metadata is not None:
                            reply_metadata.update(
                                content="".join(original_text),
                                reasoning_content="".join(final_reasoning),
                            )
                            for field in ("server_tool_calls", "annotations"):
                                if delta.get(field):
                                    reply_metadata[field] = delta[field]
                    for char in content:
                        pending += char
                        if char in "。！？!?\n" or len(pending) >= 120 or (char in "，,；;." and len(pending) >= (10 if first_clause else 24)):
                            if pending.strip():
                                if first_clause:
                                    log_stage("deepseek_first_clause", started)
                                    first_clause = False
                                yield pending
                            pending = ""
                if finished:
                    break
            if not finished:
                raise ProviderError("DeepSeek 回答流提前结束")
            if pending.strip():
                if first_clause:
                    log_stage("deepseek_first_clause", started)
                yield pending

    async def synthesize(self, text, voice):
        """Yield 24 kHz mono signed PCM16 as it arrives, without downloading a signed URL."""
        headers = {**self.qwen_headers, "X-DashScope-SSE": "enable"}
        body = {"model": self.config["QWEN_TTS_MODEL"],
                "input": {"text": text, "voice": voice, "language_type": "Auto"}}
        # Retry only before the first PCM byte. A retry after audible output
        # would repeat the start of the sentence.
        for attempt in range(2):
            received = False
            decoder = TtsPcmStream()
            try:
                async with self.client.stream(
                    "POST", self.qwen + "/api/v1/services/aigc/multimodal-generation/generation",
                    headers=headers, json=body, timeout=httpx.Timeout(10, connect=5),
                ) as response:
                    check(response, "Qwen TTS")
                    async for event in events(response, "Qwen TTS"):
                        output = event["output"]
                        data = (output.get("audio") or {}).get("data")
                        if data:
                            pcm = decoder.feed(base64.b64decode(data, validate=True))
                            if pcm:
                                received = True
                                yield pcm
                        if output.get("finish_reason") == "stop":
                            decoder.finish()
                            if received:
                                return
                raise ProviderError("Qwen TTS 未返回完整音频")
            except httpx.TransportError as exc:
                if received or attempt:
                    raise ProviderError(f"Qwen TTS {type(exc).__name__}") from exc
                await asyncio.sleep(0.15)

if __name__ == "__main__":
    try:
        settings()
    except ValueError as exc:
        raise SystemExit(str(exc)) from None
    print("本地配置检查通过。")
