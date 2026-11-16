"""Run the actual cloud worker with offline HTTP fixtures in this process only."""
import base64
import io
import json
import wave
from pathlib import Path

import httpx
import numpy as np
from dotenv import dotenv_values
from cloud import worker
from cloud.providers import Providers

config = dotenv_values(Path(__file__).resolve().parents[1] / ".env")
config.update(DASHSCOPE_API_KEY="offline-qwen", DEEPSEEK_API_KEY="offline-deepseek")
worker.settings = lambda: config
sequence = 0


def sse(events):
    return httpx.Response(200, text="".join("data: " + json.dumps(x) + "\n\n" for x in events),
                          headers={"Content-Type": "text/event-stream"})


def upstream(req):
    global sequence
    body = json.loads(req.content)
    if req.url.path.startswith("/compatible-mode"):
        audio = body["messages"][0]["content"][0]["input_audio"]["data"].split(",", 1)[1]
        with wave.open(io.BytesIO(base64.b64decode(audio))) as wav:
            assert wav.getparams()[:3] == (1, 2, 16000) and wav.getnframes() >= 1600
        assert req.headers["Authorization"] == "Bearer offline-qwen"
        sequence += 1
        return httpx.Response(200, json={"choices": [{"message": {"content": f"测试第{sequence}轮"}}]})
    if req.url.path == "/chat/completions":
        assert req.headers["Authorization"] == "Bearer offline-deepseek"
        assert "小鹿" in body["messages"][0]["content"]
        assert body["messages"][-1]["content"] == f"测试第{sequence}轮"
        return sse([{"choices": [{"delta": {"content": f"第{sequence}轮回答。"}, "finish_reason": None}]},
                    {"choices": [{"delta": {}, "finish_reason": "stop"}]}])
    assert req.url.path.endswith("/multimodal-generation/generation")
    assert body["input"]["voice"] == "Cherry" and body["input"]["text"] == f"第{sequence}轮回答。"
    assert req.headers["Authorization"] == "Bearer offline-qwen"
    pcm = (1800*np.sin(np.arange(12000) * 2*np.pi*215/24000)).astype("<i2").tobytes()
    data = base64.b64encode(pcm).decode()
    return sse([{"output":{"audio":{"data":data}, "finish_reason":"null"}}] * 8 +
               [{"output":{"audio":{"data":""}, "finish_reason":"stop"}}])


class MockProviders(Providers):
    def __init__(self, config, client):
        super().__init__(config, httpx.AsyncClient(transport=httpx.MockTransport(upstream)))


worker.Providers = MockProviders
app = worker.app
