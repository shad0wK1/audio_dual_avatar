"""Evidence checks for single-day weather lookups in Chinese voice sessions."""
import re
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from . import routing

BEIJING = ZoneInfo("Asia/Shanghai")
WEATHER = re.compile(r"天气|气温|冷不冷|热不热|带伞|下[雨雪]|多少度")
DAY_OFFSETS = {"今": 0, "明": 1, "后": 2, "昨": -1}
DAYS = re.compile(r"今天|今日|今晚|今早|明天|明晚|明早|后天|昨天|昨晚")
OTHER_PERIOD = re.compile(r"未来|过去|上周|下周|星期|周[一二三四五六日末]|月份?|季度|去年|往年|[0-9年月]+[./-][0-9]|[0-9一二三四五六七八九十]+[号日年]|平时|平常|一般|气候|四季|冬季|夏季|一周|七天")
UNCONFIRMED = "我暂时没查到能核实这个日期的天气预报。"


def forecast_day(messages, today):
    """Resolve simple relative-date forecasts, including elliptical follow-ups."""
    day = None
    for msg in reversed(messages):
        if msg["role"] != "user":
            continue
        q = msg["content"].strip(" ,，。.!！?？、")
        if OTHER_PERIOD.search(q) or routing.CONCEPT.search(q) or routing.TRANSFORM.search(q):
            return None
        offsets = {DAY_OFFSETS[word[0]] for word in DAYS.findall(q)}
        if len(offsets) > 1:
            return None
        if day is None and offsets:
            day = today + timedelta(days=offsets.pop())
        if re.search(r"为什么|为何|原理|形成|定义", q) and not DAYS.search(q):
            return None
        if WEATHER.search(q):
            return day or today
        if routing.NEW_QUESTION.search(q) or not routing.FOLLOWUP.fullmatch(q):
            break
    return None


def matches_day(source, target):
    """Require a forecast date in the title/snippet, independent of query text."""
    text = (source.get("title") or "") + " " + (source.get("snippet") or "")
    y, m, d = target.year, target.month, target.day
    md = rf"0?{m}(?:月|[-/.])0?{d}(?!\d)"
    if re.search(rf"(?<!\d){y}(?:年|[-/.]){md}", text):
        return True
    # A month/day without a year needs a contemporary publication timestamp.
    try:
        published = datetime.fromisoformat(source["published_at"].replace("Z", "+00:00")).astimezone(BEIJING).date()
    except (KeyError, AttributeError, TypeError, ValueError):
        return False
    if abs((target - published).days) > 5:
        return False
    if re.search(rf"(?<![\d年./-]){md}", text):
        return True
    return published == target and bool(re.search(r"今天|今日|今晚|今晨", text))
