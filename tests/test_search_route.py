"""Regression cases for search-tool routing in multi-turn voice conversations."""
import unittest

from cloud.routing import search_route


class SearchRouteTest(unittest.TestCase):
    def test_routes(self):
        cases = {
            "simple": [
                ["你好"], ["什么是越位？"], ["为什么会下雨？"], ["天气预报是怎么算出来的？"],
                ["汇率是什么意思？"], ["请解释什么是物联网。"], ["帮我把这句话说得自然一点"],
                ["帮我润色这条天气新闻"], ["今天天气真好，帮我写一首诗"],
                ["分析一下原因，讲讲为什么，解释成因"], ["比较一下苹果和梨"],
                ["北京明天冷不冷？", "什么是天气预报？"], ["什么是越位？", "那篮球呢？"],
            ],
            "explicit_online": [
                ["帮我上网查一下，为什么会下雨？"], ["请联网回答，什么是越位？"],
                ["search the web for tides"],
            ],
            "explicit_offline": [
                ["不用联网，凭你知道的说，今天有什么新闻？"], ["不联网回答，比较两地降雨量并分析原因"],
                ["北京明天冷不冷？", "那上海呢？不用搜索。"],
            ],
            "timely": [
                ["北京明天冷不冷？"], ["昨晚皇马赢了吗？"], ["最近有什么科技新闻？"],
                ["今天要带伞吗？"], ["今天有什么比赛？"], ["欧冠赛程"], ["天气？"],
                ["what is the current price of oil?"],
            ],
            "complex": [
                ["比较北京和上海近三年的房价，分析差异的原因"],
                ["比较两地降雨量并分析原因"], ["结合案例分析这种做法的影响"],
                ["结合数据对比两种方案"], ["compare the causes and effects of drought in both regions"],
            ],
            "followup": [
                ["北京明天冷不冷？", "那上海呢？"], ["北京明天冷不冷？", "那上海呢？", "那杭州呢？"],
                ["比较两地降雨量并分析原因", "换成广州呢？"],
            ],
        }
        for reason, turns in cases.items():
            for qs in turns:
                with self.subTest(qs=qs):
                    messages = [{"role": "system", "content": "联网搜索"}]
                    for q in qs:
                        messages += [{"role": "assistant", "content": "最新新闻"}, {"role": "user", "content": q}]
                    self.assertEqual(search_route(messages), (reason not in ("explicit_offline", "simple"), reason))
