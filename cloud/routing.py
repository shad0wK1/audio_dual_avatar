"""Decide whether a turn needs access to web search."""
import re
import unicodedata

LOOKUP = re.compile(
    r"最新|实时|现任|联网(?:搜|查)|上网查|搜一下|搜一搜|查一下|查一查|查官网|查证|核实一下|"
    r"\b(?:latest|search the web|look it up)\b", re.I)
DEFINITION = re.compile(r"什么是|是指什么|是什么意思|是怎么(?:算|计|定义)|的原理|\bwhat (?:does .* mean|is an?)\b", re.I)
SEARCH = re.compile(
    r"时事|新闻|行情|热搜|天气预报|汇率|股价|票价|油价|比分|"
    r"(?:今天|今日|明天|本周|这周|这几天|未来几天).{0,16}(?:天气|气温|下雨|降雨|有雨|下雪|几度|赛程|比赛|发布)|"
    r"(?:最近|近期|目前|当前|现在).{0,16}(?:价格|政策|版本|更新|排名|进展|流行|发生|上映|发布)|"
    r"\b(?:latest|current price|today.s weather|exchange rate)\b", re.I)
NO_SEARCH = re.compile(r"(?:不要|不用|别|无需|禁止)(?:再|去)?(?:联网|上网|搜索|查网)|\b(?:offline only|do not search|don't search)\b", re.I)


SEARCH_HINT = "结合上下文，如果回答需要核实时效性信息或用户要求联网查证，仅回复 [WEB]。其余情况直接输出可朗读的回答。"


def search_options(messages):
    question = next((m["content"] for m in reversed(messages) if m["role"] == "user"), "")
    q = unicodedata.normalize("NFKC", question)
    if NO_SEARCH.search(q):
        return False, False
    needs_search = bool(LOOKUP.search(q) or (SEARCH.search(q) and not DEFINITION.search(q)))
    return needs_search, True
