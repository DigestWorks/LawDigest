"""공식 의안정보시스템의 전체 발의자 목록을 보완 출처로 읽는다."""

from __future__ import annotations

from dataclasses import dataclass
import math
import re
import unicodedata
from urllib.parse import urlparse

from bs4 import BeautifulSoup


class ProposerSourceError(ValueError):
    """불완전한 공식 응답을 관계 데이터로 사용하지 못하게 한다."""


def _compact(value):
    if value is None or isinstance(value, float) and math.isnan(value):
        return ""
    return re.sub(r"\s+", "", unicodedata.normalize("NFKC", str(value or "")))


def _hanja(value):
    value = _compact(value)
    return value if re.fullmatch(r"[\u3400-\u4dbf\u4e00-\u9fff]+", value) else ""


def _profile_url(href):
    parsed = urlparse(str(href or ""))
    if parsed.scheme != "https" or parsed.netloc != "www.assembly.go.kr":
        raise ProposerSourceError("의원 공식 프로필 주소를 확인할 수 없습니다.")
    if not re.fullmatch(r"/members/\d+(?:st|nd|rd|th)/[A-Za-z0-9_-]+/?", parsed.path):
        raise ProposerSourceError("의원 공식 프로필 주소 구조가 변경됐습니다.")
    return parsed.path.rstrip("/")


@dataclass(frozen=True)
class Member:
    name: str
    hanja: str
    party: str
    profile: str | None


@dataclass(frozen=True)
class ProposerPage:
    members: list[Member]
    count: int
    page: int
    pages: int


def parse_representatives(html, bill_id, bill_no):
    soup = BeautifulSoup(html, "html.parser")
    identities = {tag.get("value") for tag in soup.select('input[name="billId"]')}
    numbers = {tag.get("value") for tag in soup.select('input[name="billNo"]')}
    if bill_id not in identities or str(bill_no) not in numbers:
        raise ProposerSourceError("요청한 법안과 상세 화면의 식별자가 다릅니다.")
    profiles = set()
    for section in soup.select(".law_meta_img.dtl_human"):
        label = section.select_one(".law_meta_name strong")
        if not label or _compact(label.get_text()) != "대표발의의원":
            continue
        for link in section.select('a[href*="/members/"]'):
            profiles.add(_profile_url(link.get("href")))
    if not profiles:
        raise ProposerSourceError("명시된 대표발의자를 확인할 수 없습니다.")
    return profiles


def parse_proposer_page(html, bill_no):
    soup = BeautifulSoup(html, "html.parser")
    number = soup.select_one("#billNo")
    count = soup.select_one("#pager_count_text")
    pages = soup.select_one("#pager_pages_text")
    if not number or number.get("value") != str(bill_no) or not count or not pages:
        raise ProposerSourceError(
            "제안자 목록의 법안과 전체 개수를 확인할 수 없습니다."
        )
    count_value = count.get("value", "").replace(",", "").strip()
    page_match = re.fullmatch(r"\s*\((\d+)/(\d+)\s*페이지\)\s*", pages.get("value", ""))
    if not count_value.isdecimal() or not page_match:
        raise ProposerSourceError("제안자 목록 페이지 형식이 변경됐습니다.")
    total = int(count_value)
    page, page_count = map(int, page_match.groups())
    if not 0 < total <= 500 or not 0 < page <= page_count <= 100:
        raise ProposerSourceError(
            "제안자 목록의 개수와 페이지 범위가 올바르지 않습니다."
        )
    members = []
    for item in soup.select("ul.member_list_img > li"):
        anchor = item.find("a", href=True)
        if not anchor:
            raise ProposerSourceError("제안자 목록에서 의원 정보를 읽을 수 없습니다.")
        names = [
            tag.get_text(strip=True)
            for tag in anchor.find_all("p")
            if "jdang" not in tag.get("class", [])
        ]
        if not names or not names[0]:
            raise ProposerSourceError("제안자 이름이 누락됐습니다.")
        party = anchor.select_one("p.jdang")
        href = anchor["href"]
        # 공식 명단에는 프로필이 아직 연결되지 않은 의원도 있다.
        profile = None if href == "javascript:;" else _profile_url(href)
        if profile is None and (len(names) < 2 or not _hanja(names[1])):
            raise ProposerSourceError(
                "프로필이 없는 의원의 한자명을 확인할 수 없습니다."
            )
        members.append(
            Member(
                names[0],
                names[1] if len(names) > 1 else "",
                party.get_text(strip=True) if party else "",
                profile,
            )
        )
    if not members:
        raise ProposerSourceError("제안자 목록이 비었습니다.")
    return ProposerPage(members, total, page, page_count)


def fetch_historical_member_code(session, api_key, name, hanja, term):
    """Require an unambiguous identity in the bill's assembly term."""
    name, hanja, term = _compact(name), _hanja(hanja), _compact(term)
    if not api_key or not name or not hanja or not re.fullmatch(r"[1-9][0-9]?", term):
        return None
    response = session.get(
        "https://open.assembly.go.kr/portal/openapi/ALLNAMEMBER",
        params={"KEY": api_key, "Type": "json", "pIndex": 1, "pSize": 100, "NAAS_NM": name},
        timeout=20,
    )
    response.raise_for_status()
    try:
        head, data = response.json()["ALLNAMEMBER"]
        count, status = head["head"]
        rows = data["row"]
        if status["RESULT"]["CODE"] != "INFO-000" or not 0 < len(rows) == count["list_total_count"] <= 100:
            return None
        codes = set()
        for row in rows:
            terms = {_compact(part) for part in row["GTELT_ERACO"].split(",")}
            if (
                _compact(row["NAAS_NM"]) == name
                and _hanja(row["NAAS_CH_NM"]) == hanja
                and f"제{term}대" in terms
            ):
                codes.add(_compact(row["NAAS_CD"]))
    except (KeyError, ValueError, TypeError, AttributeError):
        return None
    if len(codes) == 1:
        code = codes.pop()
        if re.fullmatch(r"[A-Z0-9]{8}", code):
            return code
    return None


def resolve_proposers(bill_id, members, representative_profiles, lawmakers, historical_code=None):
    identities = [
        member.profile or (_compact(member.name), _compact(member.hanja))
        for member in members
    ]
    profiles = {member.profile for member in members if member.profile}
    if len(set(identities)) != len(identities) or not representative_profiles.issubset(
        profiles
    ):
        raise ProposerSourceError(
            "명단이 중복되거나 대표발의자가 전체 명단에 없습니다."
        )
    resolved = []
    representatives = []
    for member in members:
        candidates = [
            row
            for row in lawmakers
            if _compact(row.get("HG_NM")) == _compact(member.name)
        ]

        def identity_matches(row):
            source_hanja, catalog_hanja = _hanja(member.hanja), _hanja(row.get("HJ_NM"))
            if source_hanja and catalog_hanja:
                return source_hanja == catalog_hanja
            # API의 한자명에 한글 등이 섞인 경우에는 이름과 정당을 함께 확인한다.
            source_party, catalog_party = (
                _compact(member.party),
                _compact(row.get("POLY_NM")),
            )
            return not (source_party and catalog_party) or source_party == catalog_party

        candidates = [row for row in candidates if identity_matches(row)]
        codes = {_compact(row.get("MONA_CD")) for row in candidates} - {""}
        if not codes and historical_code is not None:
            historical = historical_code(member)
            if historical:
                codes.add(historical)
        if len(codes) != 1:
            raise ProposerSourceError(
                "제안자와 의원 코드를 유일하게 매칭할 수 없습니다."
            )
        code = codes.pop()
        if code in resolved:
            raise ProposerSourceError("서로 다른 의원이 같은 코드로 매칭됐습니다.")
        resolved.append(code)
        if member.profile in representative_profiles:
            representatives.append(code)
    if not representatives:
        raise ProposerSourceError("대표발의자의 의원 코드를 확인하지 못했습니다.")
    return {
        "bill_id": bill_id,
        "representativeProposerIdList": representatives,
        "publicProposerIdList": resolved,
        "ProposerName": [member.name for member in members],
    }


def fetch_likms_proposers(session, bill_id, bill_no, lawmakers, historical_code=None):
    if not re.fullmatch(r"PRC_[A-Za-z0-9_]+", str(bill_id)) or not re.fullmatch(
        r"\d{7}", str(bill_no)
    ):
        raise ProposerSourceError("보완 수집할 법안 식별자가 올바르지 않습니다.")
    detail = session.get(
        "https://likms.assembly.go.kr/bill/billDetail.do",
        params={"billId": bill_id},
        timeout=30,
    )
    detail.raise_for_status()
    representatives = parse_representatives(detail.text, bill_id, bill_no)
    members = []
    expected = None
    expected_pages = None
    page_number = 1
    while True:
        response = session.get(
            "https://likms.assembly.go.kr/bill/bi/popup/billProposer.do",
            params={
                "billId": bill_id,
                "billNo": str(bill_no),
                "page": page_number,
                "tabId": "all",
            },
            timeout=30,
        )
        response.raise_for_status()
        page = parse_proposer_page(response.text, bill_no)
        if page.page != page_number or (
            expected is not None
            and (page.count != expected or page.pages != expected_pages)
        ):
            raise ProposerSourceError(
                "수집 중 제안자 목록의 페이지 또는 개수가 바뀌었습니다."
            )
        expected, expected_pages = page.count, page.pages
        members.extend(page.members)
        if len(members) > expected:
            raise ProposerSourceError("전체 개수보다 많은 제안자가 반환됐습니다.")
        if page.page == page.pages:
            break
        page_number += 1
    if len(members) != expected:
        raise ProposerSourceError("전체 제안자 명단을 확보하지 못했습니다.")
    return resolve_proposers(bill_id, members, representatives, lawmakers, historical_code)
