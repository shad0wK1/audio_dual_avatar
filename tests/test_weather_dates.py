import json
import unittest
from datetime import date, timedelta

import httpx

from cloud import routing, weather_dates
from cloud.providers import Providers
from tests.test_deepseek_router import route_response


class ForecastTest(unittest.TestCase):
    def test_followup_and_year_boundary(self):
        today = date(2026, 12, 31)
        messages = [{"role": "user", "content": q} for q in ["哈尔滨今天天气怎么样？", "那明天呢？"]]
        self.assertEqual(weather_dates.forecast_day(messages, today), today + timedelta(days=1))
        self.assertEqual(routing.search_route([{"role":"user","content":"哈尔滨天气"}]), (True, "timely"))
        self.assertIsNone(weather_dates.forecast_day([{"role":"user","content":"比较哈尔滨六月和十一月的天气"}], today))

    def test_source_date(self):
        target = date(2026, 11, 18)
        for snippet, published, expect in [
            ("2026年11月18日预报", None, True), ("11/18 周三", "2026-11-17T16:00:00Z", True),
            ("2026-06-25", "2026-06-24T16:00:00Z", False),
            ("11月18日", "2025-11-18T16:00:00Z", False),
        ]:
            self.assertEqual(weather_dates.matches_day({"snippet":snippet,"published_at":published}, target), expect)


class PlaybackGuardTest(unittest.IsolatedAsyncioTestCase):
    async def test_stale_result_never_reaches_playback(self):
        def respond(request):
            body=json.loads(request.content)
            if body.get("max_tokens") == 16:
                return route_response("WEB")
            self.assertIn("系统时钟",body["messages"][0]["content"])
            self.assertTrue(body["tools"])
            events=[
                {"server_tool_event":{"type":"call_completed","call":{"status":"completed","sources":[
                    {"title":"旧预报","snippet":"2001-06-25","published_at":"2001-06-24T16:00:00Z"}]}},"delta":{}},
                {"delta":{"content":"今天最高二十九度。"},"finish_reason":"stop"},
            ]
            return httpx.Response(200,text="".join("data: "+json.dumps({"choices":[e]})+"\n\n" for e in events))
        cfg={"DEEPSEEK_BASE_URL":"https://example.invalid","DASHSCOPE_BASE_URL":"https://example.invalid",
             "DEEPSEEK_API_KEY":"mock","DASHSCOPE_API_KEY":"mock","DEEPSEEK_MODEL":"mock"}
        async with httpx.AsyncClient(transport=httpx.MockTransport(respond)) as client:
            stream=Providers(cfg,client).sentences([{"role":"user","content":"哈尔滨今天天气怎么样？"}])
            self.assertEqual([s async for s in stream],[weather_dates.UNCONFIRMED])
