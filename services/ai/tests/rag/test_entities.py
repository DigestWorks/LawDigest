import pytest

from lawdigest_ai.rag.entities import display_name, match_entities

MEMBERS = [
    "김병기",
    "추경호",
    "황희",
    "이용",
    "이수진(李秀眞)",
    "이수진(비례)",
    "박지원",
]
PARTIES = ["더불어민주당", "국민의힘", "조국혁신당"]


def match(question):
    return match_entities(question, MEMBERS, PARTIES)


@pytest.mark.parametrize(
    "question",
    [
        "김병기",
        "김병기 의원",
        "김병기의원",
        "김병기 의원이 낸 법안",
        "김병기의 국방 법안",
    ],
)
def test_member_name_with_titles_and_particles(question):
    assert match(question)["members"] == ["김병기"]


def test_two_members_in_order_of_appearance():
    assert match("추경호와 김병기 법안 비교")["members"] == ["추경호", "김병기"]


@pytest.mark.parametrize("question", ["서비스 이용 요금 법안", "이용을 늘리는 법안"])
def test_two_letter_name_needs_a_title(question):
    assert match(question)["members"] == []


@pytest.mark.parametrize("question", ["황희", "황희 의원", "황희의원 법안"])
def test_two_letter_name_with_title_or_alone(question):
    assert match(question)["members"] == ["황희"]


def test_parenthesized_names_match_by_display_name():
    assert display_name("김병욱(민주)") == "김병욱"
    assert match("이수진 의원")["members"] == ["이수진(李秀眞)", "이수진(비례)"]


@pytest.mark.parametrize(
    ("question", "parties"),
    [
        ("국민의힘", ["국민의힘"]),
        ("민주당 법안", ["더불어민주당"]),
        ("더불어민주당과 국민의힘 비교", ["더불어민주당", "국민의힘"]),
        ("전세사기 피해자 지원", []),
    ],
)
def test_party_names_and_aliases(question, parties):
    assert match(question)["parties"] == parties
