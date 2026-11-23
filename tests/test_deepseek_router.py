import json
import unittest

import httpx

from cloud.providers import ProviderError, Providers


def route_response(label, finish_reason="stop"):
    events = [{"delta": {"content": part}} for part in (label[:3], label[3:])]
    if finish_reason is not None:
        events.append({"delta": {}, "finish_reason": finish_reason})
    wire = "".join("data: " + json.dumps({"choices": [event]}) + "\n\n" for event in events)
    return httpx.Response(200, text=wire + "data: [DONE]\n\n")


class TwoCallTest(unittest.IsolatedAsyncioTestCase):
    async def test_request_sequence(self):
        cases = [
            ("DIRECT", "为什么会下雨？", False),
            ("WEB", "那哈尔滨呢？", True),
            ("WEB_SIMPLE", "国博通常周几闭馆？", True),
            ("DIRECT", "昨晚皇马赢了吗？", False),
            ("unsure", "今晚有什么赛事？", None),
            (None, "什么是越位？", None),
        ]
        for label, question, expect_web in cases:
            with self.subTest(label=label, question=question):
                requests = []
                def handle(req):
                    body = json.loads(req.content)
                    requests.append(body)
                    self.assertTrue(body["stream"])
                    if len(requests) == 1:
                        if label is None:
                            raise httpx.ReadTimeout("simulated")
                        return route_response(label)
                    chunk = {"choices":[{"finish_reason":"stop","delta":{"content":"回答。"}}]}
                    source = {"choices": [{"server_tool_event": {"type": "call_completed",
                              "call": {"status": "completed", "sources": [{"title": "官方公告"}]}}}]}
                    events = [source, chunk] if expect_web else [chunk]
                    return httpx.Response(200, text="".join("data: "+json.dumps(e)+"\n\n" for e in events))

                config = dict(DEEPSEEK_BASE_URL="https://example.invalid", DASHSCOPE_BASE_URL="https://example.invalid",
                              DASHSCOPE_API_KEY="test", DEEPSEEK_API_KEY="test", DEEPSEEK_MODEL="test")
                history = [{"role":"user", "content":"昨晚北京队赢了吗？"},
                           {"role":"assistant","content":"我们可以查比赛结果。","reasoning_content":"internal"},
                           {"role":"user","content":question}]
                async with httpx.AsyncClient(transport=httpx.MockTransport(handle)) as client:
                    reply = Providers(config, client).sentences(history)
                    if expect_web is None:
                        with self.assertRaises(ProviderError):
                            await anext(reply)
                        self.assertEqual(len(requests), 1)
                        continue
                    result = [s async for s in reply]
                self.assertEqual(result, ["回答。"])
                self.assertEqual(len(requests), 2)
                self.assertNotIn("tools", requests[0])
                self.assertNotIn("internal", requests[0]["messages"][-1]["content"])
                self.assertIn(history[0]["content"], requests[0]["messages"][-1]["content"])
                self.assertEqual(requests[1]["messages"][-1], history[-1])
                self.assertEqual(bool(requests[1].get("tools")), expect_web)
                self.assertEqual(requests[1]["thinking"]["type"], "disabled" if label == "WEB_SIMPLE" else "enabled")

    async def test_incomplete_route_never_starts_answer(self):
        cfg = dict(DEEPSEEK_BASE_URL="https://mock.invalid", DASHSCOPE_BASE_URL="https://mock.invalid",
                   DEEPSEEK_API_KEY="test", DASHSCOPE_API_KEY="test", DEEPSEEK_MODEL="test")
        for reason in (None, "length"):
            with self.subTest(reason=reason):
                requests = []
                def respond(request):
                    requests.append(request)
                    return route_response("WEB", reason)
                async with httpx.AsyncClient(transport=httpx.MockTransport(respond)) as client:
                    reply = Providers(cfg, client).sentences([{"role": "user", "content": "查官网"}])
                    with self.assertRaises(ProviderError):
                        await anext(reply)
                self.assertEqual(len(requests), 1)

    async def test_missing_sources_retried_before_speaking(self):
        attempts = []
        def respond(request):
            body = json.loads(request.content)
            if body.get("max_tokens") == 16:
                return route_response("WEB_SIMPLE")
            attempts.append(body["thinking"]["type"])
            events = [{"delta": {"content": "没有依据的答复。"}}]
            if attempts == ["disabled", "enabled"]:
                events.extend([
                    {"server_tool_event": {"type": "call_completed", "call": {
                        "status": "completed", "sources": [{"title": "官方公告"}]}}},
                    {"delta": {"content": "已核实的答复。"}},
                ])
            events.append({"finish_reason": "stop", "delta": {}})
            wire = "".join("data: "+json.dumps({"choices": [event]})+"\n\n" for event in events)
            return httpx.Response(200, text=wire)
        cfg = dict(DEEPSEEK_BASE_URL="https://mock.invalid", DASHSCOPE_BASE_URL="https://mock.invalid",
                   DEEPSEEK_API_KEY="test", DASHSCOPE_API_KEY="test", DEEPSEEK_MODEL="test")
        async with httpx.AsyncClient(transport=httpx.MockTransport(respond)) as client:
            meta = {}
            stream = Providers(cfg, client).sentences([{"role": "user", "content": "国博通常周几闭馆？"}], meta)
            self.assertEqual([s async for s in stream], ["已核实的答复。"])
        self.assertEqual(attempts, ["disabled", "enabled"])
        self.assertEqual(meta["content"], "已核实的答复。")
