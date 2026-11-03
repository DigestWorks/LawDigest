from pathlib import Path
from unittest.mock import Mock

import pytest

from lawdigest_data.bills.likms_proposers import (
    ProposerSourceError,
    fetch_historical_member_code,
    fetch_likms_proposers,
    parse_proposer_page,
    parse_representatives,
    resolve_proposers,
)

FIXTURES = Path(__file__).parent / "fixtures"
DETAIL = (FIXTURES / "likms_detail.html").read_text()
POPUP = (FIXTURES / "likms_proposers.html").read_text()
BILL_ID = "PRC_T2U6T0O9P0N8N1M4N4L5L0U0S4S6Q8"
BILL_NO = "2222388"


def lawmakers():
    return [
        {"HG_NM": member.name, "HJ_NM": member.hanja, "MONA_CD": f"M{i}"}
        for i, member in enumerate(parse_proposer_page(POPUP, BILL_NO).members)
    ]


def test_official_fixture_has_ten_members_and_explicit_representative():
    page = parse_proposer_page(POPUP, BILL_NO)
    representatives = parse_representatives(DETAIL, BILL_ID, BILL_NO)
    # 이름 순서를 바꿔도 공식 대표 역할은 유지해야 한다.
    members = list(reversed(page.members))
    result = resolve_proposers(BILL_ID, members, representatives, lawmakers())
    assert page.count == len(members) == 10
    assert result["representativeProposerIdList"] == ["M0"]
    assert result["publicProposerIdList"][0] == "M9"


@pytest.mark.parametrize(
    "detail",
    [DETAIL.replace(BILL_ID, "another-id"), DETAIL.replace("대표발의의원", "제안자")],
)
def test_wrong_bill_or_missing_representative_is_rejected(detail):
    with pytest.raises(ProposerSourceError):
        parse_representatives(detail, BILL_ID, BILL_NO)


def test_ambiguous_or_missing_member_code_rejects_the_entire_list():
    page = parse_proposer_page(POPUP, BILL_NO)
    representatives = parse_representatives(DETAIL, BILL_ID, BILL_NO)
    for rows in [
        lawmakers()[1:],
        lawmakers() + [{**lawmakers()[0], "MONA_CD": "other"}],
    ]:
        with pytest.raises(ProposerSourceError):
            resolve_proposers(BILL_ID, page.members, representatives, rows)


def test_duplicate_profiles_or_missing_representative_are_rejected():
    page = parse_proposer_page(POPUP, BILL_NO)
    for members, representatives in [
        (page.members + [page.members[0]], {page.members[0].profile}),
        (page.members[1:], {page.members[0].profile}),
    ]:
        with pytest.raises(ProposerSourceError):
            resolve_proposers(BILL_ID, members, representatives, lawmakers())


def test_fetch_reads_all_pages_and_requires_declared_total():
    from bs4 import BeautifulSoup

    soup = BeautifulSoup(POPUP, "html.parser")
    rows = soup.select("ul.member_list_img > li")
    first = BeautifulSoup(POPUP, "html.parser")
    second = BeautifulSoup(POPUP, "html.parser")
    first.select_one("#pager_pages_text")["value"] = " (1/2 페이지)"
    second.select_one("#pager_pages_text")["value"] = " (2/2 페이지)"
    for doc, selected in [(first, rows[:5]), (second, rows[5:])]:
        doc.select_one("ul.member_list_img").clear()
        for member in selected:
            doc.select_one("ul.member_list_img").append(member)
    session = Mock()
    session.get.side_effect = [
        Mock(text=DETAIL),
        Mock(text=str(first)),
        Mock(text=str(second)),
    ]
    result = fetch_likms_proposers(session, BILL_ID, BILL_NO, lawmakers())
    assert len(result["publicProposerIdList"]) == 10
    assert session.get.call_args.kwargs["params"]["page"] == 2
    assert all(call.kwargs["timeout"] == 30 for call in session.get.call_args_list)


@pytest.mark.parametrize(
    "popup",
    [
        POPUP.replace('value="10"', 'value="11"'),
        POPUP.replace('value="2222388"', 'value="2222389"'),
        POPUP.replace('value=" (1/1 페이지)"', 'value=" (2/2 페이지)"'),
    ],
)
def test_incomplete_or_changed_source_never_returns_partial_relations(popup):
    session = Mock()
    session.get.side_effect = [Mock(text=DETAIL), Mock(text=popup)]
    with pytest.raises(ProposerSourceError):
        fetch_likms_proposers(session, BILL_ID, BILL_NO, lawmakers())


def test_invalid_identifier_makes_no_request():
    session = Mock()
    with pytest.raises(ProposerSourceError):
        fetch_likms_proposers(session, "../../other", BILL_NO, lawmakers())
    session.get.assert_not_called()


def test_unlinked_public_member_can_match_by_unique_name_and_hanja():
    popup = POPUP.replace(
        "https://www.assembly.go.kr/members/22nd/PARKSANGHYUK", "javascript:;"
    )
    page = parse_proposer_page(popup, BILL_NO)
    result = resolve_proposers(
        BILL_ID,
        page.members,
        parse_representatives(DETAIL, BILL_ID, BILL_NO),
        lawmakers(),
    )
    assert len(result["publicProposerIdList"]) == 10
    assert result["representativeProposerIdList"] == ["M0"]


def test_incomplete_catalog_hanja_requires_matching_party_and_unique_name():
    from dataclasses import replace

    page = parse_proposer_page(POPUP, BILL_NO)
    members = [
        replace(page.members[0], name="백승아", hanja="白承婀", party="더불어민주당")
    ]
    representatives = {members[0].profile}
    row = {
        "HG_NM": "백승아",
        "HJ_NM": "白承아",
        "POLY_NM": "더불어민주당",
        "MONA_CD": "CODE",
    }
    assert resolve_proposers(BILL_ID, members, representatives, [row])[
        "representativeProposerIdList"
    ] == ["CODE"]
    for invalid in [{**row, "POLY_NM": "다른정당"}, {**row, "HJ_NM": "白承乙"}]:
        with pytest.raises(ProposerSourceError):
            resolve_proposers(BILL_ID, members, representatives, [invalid])


def test_compatibility_hanja_is_compared_by_unicode_identity():
    from dataclasses import replace

    page = parse_proposer_page(POPUP, BILL_NO)
    member = replace(page.members[0], name="이해식", hanja="李海植")
    row = {"HG_NM": "이해식", "HJ_NM": "李海植", "MONA_CD": "CODE"}
    assert resolve_proposers(BILL_ID, [member], {member.profile}, [row])[
        "representativeProposerIdList"
    ] == ["CODE"]


def historical_result(rows, count=None):
    return {
        "ALLNAMEMBER": [
            {
                "head": [
                    {"list_total_count": len(rows) if count is None else count},
                    {"RESULT": {"CODE": "INFO-000"}},
                ]
            },
            {"row": rows},
        ]
    }


def test_official_list_recovers_missing_representative_from_matching_historical_term():
    first = parse_proposer_page(POPUP, BILL_NO).members[0]
    session = Mock()
    session.get.side_effect = [
        Mock(text=DETAIL),
        Mock(text=POPUP),
        Mock(json=lambda: historical_result([
            {"NAAS_NM": first.name, "NAAS_CH_NM": first.hanja, "NAAS_CD": "000000AA", "GTELT_ERACO": "제21대"},
            {"NAAS_NM": first.name, "NAAS_CH_NM": first.hanja, "NAAS_CD": "000000AB", "GTELT_ERACO": "제21대, 제22대"},
        ])),
    ]

    def lookup(member):
        return fetch_historical_member_code(session, "test-key", member.name, member.hanja, "22")

    result = fetch_likms_proposers(session, BILL_ID, BILL_NO, lawmakers()[1:], lookup)
    assert result["representativeProposerIdList"] == ["000000AB"]
    assert len(result["publicProposerIdList"]) == 10
    assert session.get.call_count == 3


@pytest.mark.parametrize("scenario", ["ambiguous", "partial", "other_hanja", "invalid_shape"])
def test_unsafe_historical_response_does_not_produce_a_code(scenario):
    session = Mock()
    row = {"NAAS_NM": "이해민", "NAAS_CH_NM": "李海珉", "NAAS_CD": "0698755I", "GTELT_ERACO": "제22대"}
    response = historical_result([row])
    if scenario == "ambiguous":
        response = historical_result([row, {**row, "NAAS_CD": "0000000X"}])
    elif scenario == "partial":
        response = historical_result([row], count=2)
    elif scenario == "other_hanja":
        response = historical_result([{**row, "NAAS_CH_NM": "李海民"}])
    else:
        response = {"RESULT": {"CODE": "INFO-200"}}
    session.get.return_value.json.return_value = response
    assert fetch_historical_member_code(session, "test-key", "이해민", "李海珉", "22") is None


@pytest.mark.parametrize("hanja,term", [("", "22"), ("李海珉", None), ("李海珉", "unknown")])
def test_incomplete_historical_identity_does_not_query_source(hanja, term):
    session = Mock()
    assert fetch_historical_member_code(session, "test-key", "이해민", hanja, term) is None
    session.get.assert_not_called()
