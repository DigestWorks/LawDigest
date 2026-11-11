"""질문 속 의원·정당 이름을 DB 이름 목록과 대조한다.

어절마다 조사와 호칭을 떼어 낸 형태를 만들고, 그 형태가 DB 이름과 같을 때만 인정한다.
두 글자 이름은 일반 단어(예: '이용')와 겹치므로 호칭이 붙었거나 질문 전체가 이름일 때만 인정한다.
"""

import re

PARTICLES = (
    "에게서",
    "으로서",
    "이라고",
    "이랑",
    "에게",
    "께서",
    "한테",
    "에서",
    "으로",
    "까지",
    "부터",
    "보다",
    "처럼",
    "이",
    "가",
    "은",
    "는",
    "을",
    "를",
    "의",
    "과",
    "와",
    "도",
    "만",
    "랑",
    "로",
    "께",
)
TITLES = ("국회의원", "의원님", "원내대표", "의원", "대표", "님", "씨")
# 널리 쓰는 정당 줄임말 → DB 정당 이름
PARTY_ALIASES = {"민주당": "더불어민주당", "국힘": "국민의힘"}
MAX_MEMBERS = 2
MAX_PARTIES = 2
_WORD = re.compile(r"[가-힣A-Za-z0-9·]+")


def display_name(name):
    """'이수진(李秀眞)', '김병욱(민주)'처럼 구분용 괄호를 뗀 이름"""
    return re.sub(r"\s*\(.*?\)\s*$", "", name or "").strip()


def _forms(word):
    """조사·호칭을 뗀 모든 형태와, 그중 호칭을 뗀 형태를 돌려준다."""
    forms, titled, queue = {word}, set(), [word]
    while queue:
        current = queue.pop()
        for suffix in (*PARTICLES, *TITLES):
            if current.endswith(suffix) and len(current) - len(suffix) >= 2:
                stem = current[: -len(suffix)]
                if suffix in TITLES:
                    titled.add(stem)
                if stem not in forms:
                    forms.add(stem)
                    queue.append(stem)
    return forms, titled


def match_entities(question, member_names, party_names):
    """질문에 나온 의원 DB 이름(표시 이름 기준 최대 2명)과 정당 이름(최대 2개)을 나온 순서대로 돌려준다."""
    question = (question or "").strip()
    words = _WORD.findall(question)
    by_display = {}
    for name in member_names:
        by_display.setdefault(display_name(name), []).append(name)
    parties = set(party_names)
    # "황희 의원"처럼 질문 전체가 이름과 호칭이면 두 글자 이름도 인정한다.
    _, whole_titled = _forms(question.replace(" ", ""))

    members, matched_displays, matched_parties = [], [], []
    for index, word in enumerate(words):
        forms, titled = _forms(word)
        following = words[index + 1] if index + 1 < len(words) else ""
        if following and _forms(following)[0] & set(TITLES):
            titled |= forms
        for form in forms:
            # 두 글자 이름은 일반 단어와 겹치므로 호칭이 있거나 질문 전체가 이름이어야 한다.
            confident = len(form) >= 3 or form in titled | whole_titled | {question}
            if form in by_display and form not in matched_displays and confident:
                matched_displays.append(form)
            party = PARTY_ALIASES.get(form, form)
            if party in parties and party not in matched_parties:
                matched_parties.append(party)
    for form in matched_displays[:MAX_MEMBERS]:
        members.extend(by_display[form])
    return {"members": members, "parties": matched_parties[:MAX_PARTIES]}
