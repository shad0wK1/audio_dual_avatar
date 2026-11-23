"""Local rules for enabling DeepSeek web search on a spoken turn."""
import re
import unicodedata


def pattern(expression):
    return re.compile(expression, re.IGNORECASE)


OFFLINE = pattern(
    r"(?:不要|不用|不必|不|无需|禁止|别|不许|不想|不需要)(?:再|去|用)?(?:联网|上网|搜|查网)|"
    r"离线(?:回答|回复)|\b(?:offline only|do not search|don't search|without (?:web )?search)\b"
)
ONLINE = pattern(
    r"(?:联网|上网)(?:帮我|给我|去|来|进行)?(?:搜|查|看|核实|核对|回答|回复)|"
    r"(?:帮我|请|先|需要)(?:你)?(?:联网|上网|搜搜|搜索|搜一下|查一下)|"
    r"搜一下|搜一搜|查一下|查一查|查官网|查证|核实一下|^(?:联网|上网)[，,。！？?! ]*$|"
    r"\b(?:search (?:the web|online)|look (?:it |this )?up|browse the web)\b"
)
CONCEPT = pattern(
    r"什么(?:是|叫)|是什么(?:意思|节目|概念)|是指什么|的(?:含义|原理|定义)|"
    r"有(?:什么|哪些)区别|有什么不同|(?:是)?怎么(?:来的|做出来|算|计|定义|形成|预测|预报)|如何(?:计算|定义|形成|预测)|"
    r"\b(?:what does .+ mean|what is (?:an?|the concept of) |how (?:is|are) .+ calculated)\b"
)
TIME = pattern(
    r"今天|今日|今[晨晚夜]|明[天晚早]|昨[天晚夜日]|后天|这周|本周|下周|上周|"
    r"最近|近期|这几天|今年|本月|当前|目前|现在|未来几天|周末|"
    r"\b(?:today|tonight|tomorrow|yesterday|current|recent|this week)\b"
)
LIVE_TOPIC = pattern(
    r"天气|气温|温度|冷不冷|热不热|下雨|下雪|降雨|有雨|几度|带伞|"
    r"新闻|时事|热搜|头条|热点|大事|发生了什么|"
    r"比赛|赛事|赛程|比分|开赛|开球|对阵|战绩|战况|积分榜|夺冠|冠军|(?:赢|输)了|谁赢|"
    r"价格|房价|股价|油价|票价|行情|汇率|利率|政策|版本|排名|进展|上映|发布|"
    r"\b(?:weather|forecast|news|score|schedule|match|win|won|price|rate|ranking|release)\b"
)
# These forms usually ask for a live value even without a date.
LIVE_QUERY = pattern(
    r"天气(?:预报|如何|怎么样)|天气[?？。!！ ]*$|(?:冷不冷|热不热)|会不会下[雨雪]|会下[雨雪](?:吗|么)|要带伞吗|"
    r"新闻|时事|热搜|头条|赛程|比分|战况|积分榜|行情|汇率|股价|油价|票价|"
    r"什么时候(?:开赛|开球)|(?:比赛|赛事).*(?:几点|结果|什么时候)|"
    r"谁赢了|(?:赢|输)了?吗|现任|最新|实时|\b(?:latest|weather forecast|exchange rate|stock price)\b"
)
TRANSFORM = pattern(r"(?:帮我|请)?(?:改写|润色|翻译|复述)|(?:写|编)(?:一[条篇段个首])(?:新闻稿|新闻标题|故事|诗|句子)")
COMPLEXITY = (
    pattern(r"对比|比较|相比|比一比|异同|差异|区别|优劣|\b(?:compare|comparison|contrast|versus)\b"),
    pattern(r"为什么|为何|成因|原因|影响|利弊|归因|分析.{0,8}(?:后果|风险)|\b(?:why|causes?|impact|effects?)\b"),
    pattern(r"(?:同时考虑|综合考虑|兼顾).{1,18}(?:和|与|及|、).+|(?:结合|根据|依据|参考|列举|用|从).{0,12}(?:数据|案例|证据|指标|维度|因素|条件)|"
            r"(?:从|兼顾|同时考虑|综合考虑).{1,18}(?:和|与|及|、).{1,12}(?:方面|角度|考虑|分析)|"
            r"(?:近|过去)(?:\d+|[一二三四五六七八九十两]+)年|"
            r"\b(?:using data|case stud(?:y|ies)|multiple factors)\b"),
)
FOLLOWUP = pattern(
    r"(?:那(?:么)?|换成|换到)?[\w· -]{1,16}(?:呢|又如何)|那(?:么)?(?:明天|后天|下周|周末)|"
    r"然后呢|还有吗|接着说|继续(?:说)?|再说说|还有哪些|"
    r"(?:what|how) about [\w -]{1,30}"
)
NEW_QUESTION = pattern(r"是什么|什么是|为什么|怎么|如何|谁|多少|哪些|为何|请问|帮我|解释|讲讲|推荐")


def search_route(messages):
    """Return (enable_web, reason). Only user turns can supply routing intent."""
    questions = [unicodedata.normalize("NFKC", m["content"]).strip()
                 for m in messages if m["role"] == "user" and m.get("content")]
    following = False
    for q in reversed(questions):
        if OFFLINE.search(q):
            return False, "explicit_offline"
        if ONLINE.search(q):
            return True, "followup" if following else "explicit_online"
        words = q.strip(" ,，。.!！?？、")
        topic = LIVE_TOPIC.search(words)
        asks_about_concept = CONCEPT.search(q)
        if not TRANSFORM.search(q) and not asks_about_concept:
            if LIVE_QUERY.search(q) or (topic and TIME.search(q)) or (topic and words == topic.group()):
                return True, "followup" if following else "timely"
        if sum(bool(rule.search(q)) for rule in COMPLEXITY) >= 2:
            return True, "followup" if following else "complex"
        if not NEW_QUESTION.search(words) and FOLLOWUP.fullmatch(words):
            following = True
            continue
        break
    return False, "simple"
