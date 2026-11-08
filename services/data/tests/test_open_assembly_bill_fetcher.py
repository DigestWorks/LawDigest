import os
import sys
from unittest.mock import Mock, patch

import pandas as pd

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import lawdigest_data.bills.DataFetcher as data_fetcher_module  # noqa: E402
from lawdigest_data.bills.DataFetcher import DataFetcher  # noqa: E402


class _FakeClient:
    def __init__(self, session, api_key):
        self.session = session
        self.api_key = api_key

    def fetch_rows(self, endpoint, params=None, all_pages=True, page_size=100):
        if endpoint == "nwbqublzajtcqpdae":
            return self.fetch_pending_bills()
        if endpoint == "nzpltgfqabtcpsmai":
            return self.fetch_processed_bills(str((params or {}).get("AGE", "22")))
        if endpoint == "nxjuyqnxadtotdrbw":
            return self.fetch_recent_plenary_bills(str((params or {}).get("AGE", "22")))
        if endpoint == "BILLRCP":
            return self.fetch_bill_receipts(str((params or {}).get("ERACO", "22")))
        return []

    def fetch_bill_receipts(self, age):
        return []

    def fetch_pending_bills(self):
        return [
            {
                "BILL_ID": "BILL-1",
                "BILL_NO": "2200001",
                "PROPOSE_DT": "2026-04-15",
                "BILL_NM": "테스트 법안",
            }
        ]

    def fetch_processed_bills(self, age):
        return []

    def fetch_recent_plenary_bills(self, age):
        return []

    def fetch_member_bills(self, age, **filters):
        return []

    def fetch_bill_detail(self, bill_id):
        return {
            "BILL_ID": bill_id,
            "BILL_NO": "2200001",
            "BILL_NM": "테스트 법안",
            "PPSR_KIND": "의원",
            "PPSR": "홍길동의원 등 10인",
            "PPSL_DT": "2026-04-15",
        }

    def fetch_bill_summary(self, bill_no):
        return {
            "BILL_NO": bill_no,
            "SUMMARY": "열린국회정보 요약",
        }

    def fetch_bill_lifecycle(self, bill_no):
        return {
            "BILL_NO": bill_no,
            "JRCMIT_NM": "정무위원회",
            "LINK_URL": "https://example.com/bill/2200001",
            "PDF_LINK_URL": "https://example.com/bill/2200001.pdf",
        }


class _FakeClientWithoutSummary(_FakeClient):
    def fetch_bill_summary(self, bill_no):
        return {}


class _FakeClientWithMissingOptionalResponses(_FakeClient):
    def fetch_bill_summary(self, bill_no):
        return None

    def fetch_bill_lifecycle(self, bill_no):
        return None


def test_discover_bill_candidates_collects_base_bill_rows(monkeypatch):
    monkeypatch.setenv("APIKEY_billsInfo", "test-key")
    monkeypatch.setattr(data_fetcher_module, "OpenAssemblyBillClient", _FakeClient)

    fetcher = DataFetcher(filter_data=False)
    df = fetcher.discover_bill_candidates(
        start_date="2026-04-15", end_date="2026-04-15", age="22"
    )

    assert len(df) == 1
    row = df.iloc[0]
    assert row["bill_id"] == "BILL-1"
    assert row["bill_name"] == "테스트 법안"
    assert row["summary"] is None
    assert row["stage"] == "접수"
    assert row["assemblyNumber"] == "22"


def test_fetch_bills_data_uses_open_assembly_hydration(monkeypatch):
    monkeypatch.setenv("APIKEY_billsInfo", "test-key")
    monkeypatch.setattr(data_fetcher_module, "OpenAssemblyBillClient", _FakeClient)

    fetcher = DataFetcher(filter_data=False)
    df = fetcher.fetch_bills_data(
        start_date="2026-04-15", end_date="2026-04-15", age="22"
    )

    assert len(df) == 1
    row = df.iloc[0]
    assert row["bill_id"] == "BILL-1"
    assert row["bill_name"] == "테스트 법안"
    assert row["summary"] == "열린국회정보 요약"
    assert row["stage"] == "위원회 심사"
    assert row["committee"] == "정무위원회"
    assert row["bill_link"] == "https://example.com/bill/2200001"
    assert row["billPdfUrl"] == "https://example.com/bill/2200001.pdf"
    assert row["proposer_kind"] == "의원"
    assert row["assemblyNumber"] == "22"


def test_fetch_bills_data_keeps_partial_bill_without_summary(monkeypatch):
    monkeypatch.setenv("APIKEY_billsInfo", "test-key")
    monkeypatch.setattr(
        data_fetcher_module, "OpenAssemblyBillClient", _FakeClientWithoutSummary
    )

    fetcher = DataFetcher(filter_data=False)
    df = fetcher.fetch_bills_data(
        start_date="2026-04-15", end_date="2026-04-15", age="22"
    )

    assert len(df) == 1
    row = df.iloc[0]
    assert row["bill_id"] == "BILL-1"
    assert row["summary"] is None
    assert row["stage"] == "위원회 심사"


def test_fetch_bills_data_keeps_partial_bill_when_optional_open_assembly_rows_are_missing(
    monkeypatch,
):
    monkeypatch.setenv("APIKEY_billsInfo", "test-key")
    monkeypatch.setattr(
        data_fetcher_module,
        "OpenAssemblyBillClient",
        _FakeClientWithMissingOptionalResponses,
    )

    fetcher = DataFetcher(filter_data=False)
    df = fetcher.fetch_bills_data(
        start_date="2026-04-15", end_date="2026-04-15", age="22"
    )

    assert len(df) == 1
    row = df.iloc[0]
    assert row["bill_id"] == "BILL-1"
    assert row["bill_name"] == "테스트 법안"
    assert row["summary"] is None
    assert row["stage"] == "접수"
    assert row["proposer_kind"] == "의원"


def test_fetch_bills_coactors_retries_empty_bill_response():
    fetcher = DataFetcher()
    fetcher.df_lawmakers = pd.DataFrame(
        {
            "HG_NM": ["홍길동"],
            "MONA_CD": ["M1"],
        }
    )
    empty_response = pd.DataFrame()
    valid_response = pd.DataFrame(
        [
            {
                "BILL_ID": "BILL-1",
                "PUBL_PROPOSER": "대표발의",
                "PPSR_CD": "M1",
                "PPSR_NM": "홍길동",
            }
        ]
    )

    with (
        patch.dict("os.environ", {"APIKEY_billProposers": "test-key"}),
        patch.object(
            fetcher,
            "fetch_data_generic",
            side_effect=[empty_response, valid_response],
        ) as fetch_data,
        patch("lawdigest_data.bills.DataFetcher.time.sleep"),
    ):
        result = fetcher.fetch_bills_coactors(
            df_bills=pd.DataFrame({"bill_id": ["BILL-1"]}),
            max_retry=1,
        )

    assert result["bill_id"].tolist() == ["BILL-1"]
    assert fetch_data.call_count == 2
    assert "max_retry" not in fetch_data.call_args_list[0].kwargs["params"]


def test_assembly_codes_include_coauthors_with_empty_representative_flag():
    fetcher = DataFetcher()
    fetcher.df_lawmakers = pd.DataFrame({"HG_NM": ["같은 이름", "같은 이름"], "MONA_CD": ["M1", "M2"]})
    rows = pd.DataFrame(
        [
            {"BILL_ID": "PRC_SAMPLE", "PPSR_ROLE": "발의자", "NASS_CD": "M2", "PPSR_NM": "같은 이름"},
            {
                "BILL_ID": "PRC_SAMPLE",
                "PPSR_ROLE": "발의자",
                "REP_DIV": "대표발의",
                "NASS_CD": "M1",
                "PPSR_NM": "같은 이름",
            },
        ]
    )
    bills = pd.DataFrame({"bill_id": ["PRC_SAMPLE"], "billNumber": [2214937]})
    with (
        patch.dict("os.environ", {"APIKEY_billProposers": "test-key"}),
        patch.object(fetcher, "fetch_data_generic", return_value=rows),
        patch("lawdigest_data.bills.DataFetcher.fetch_likms_proposers") as fallback,
    ):
        result = fetcher.fetch_bills_coactors(bills, max_retry=0)
    assert result.iloc[0]["publicProposerIdList"] == ["M1", "M2"]
    assert result.iloc[0]["representativeProposerIdList"] == ["M1"]
    fallback.assert_not_called()


def test_assembly_codes_without_representative_flag_still_require_confirmation():
    fetcher = DataFetcher()
    fetcher.df_lawmakers = pd.DataFrame({"HG_NM": ["홍길동"], "MONA_CD": ["M1"]})
    rows = pd.DataFrame(
        [{"BILL_ID": "PRC_SAMPLE", "PPSR_ROLE": "발의자", "NASS_CD": "M1", "PPSR_NM": "홍길동"}]
    )
    bills = pd.DataFrame({"bill_id": ["PRC_SAMPLE"], "billNumber": [2214937]})
    with (
        patch.dict("os.environ", {"APIKEY_billProposers": "test-key"}),
        patch.object(fetcher, "fetch_data_generic", return_value=rows),
        patch("lawdigest_data.bills.DataFetcher.fetch_likms_proposers", return_value=None) as fallback,
    ):
        result = fetcher.fetch_bills_coactors(bills, max_retry=0)
    assert result.empty
    fallback.assert_called_once()


def test_empty_api_uses_complete_official_list_before_repeated_requests():
    fetcher = DataFetcher()
    fetcher.df_lawmakers = pd.DataFrame({"HG_NM": ["홍길동"], "MONA_CD": ["M1"]})
    official = {
        "bill_id": "PRC_SAMPLE",
        "publicProposerIdList": ["M1"],
        "representativeProposerIdList": ["M1"],
        "ProposerName": ["홍길동"],
    }
    with (
        patch.dict("os.environ", {"APIKEY_billProposers": "test-key"}),
        patch.object(fetcher, "fetch_data_generic", return_value=pd.DataFrame()) as api,
        patch(
            "lawdigest_data.bills.DataFetcher.fetch_likms_proposers",
            return_value=official,
        ) as fallback,
    ):
        result = fetcher.fetch_bills_coactors(
            pd.DataFrame({"bill_id": ["PRC_SAMPLE"], "billNumber": [2222388]})
        )
    assert result.iloc[0]["representativeProposerIdList"] == ["M1"]
    assert api.call_count == fallback.call_count == 1


def test_public_list_without_confirmed_representative_is_not_guessed():
    fetcher = DataFetcher()
    fetcher.df_lawmakers = pd.DataFrame({"HG_NM": ["홍길동"], "MONA_CD": ["M1"]})
    public_only = pd.DataFrame(
        [
            {
                "BILL_ID": "BILL-1",
                "PUBL_PROPOSER": "공동발의",
                "PPSR_CD": "M1",
                "PPSR_NM": "홍길동",
            }
        ]
    )
    with (
        patch.dict("os.environ", {"APIKEY_billProposers": "test-key"}),
        patch.object(fetcher, "fetch_data_generic", return_value=public_only),
    ):
        result = fetcher.fetch_bills_coactors(pd.DataFrame({"bill_id": ["BILL-1"]}))
    assert result.empty


def test_generic_paging_marks_partial_snapshot_incomplete():
    fetcher = DataFetcher()
    with (
        patch.object(fetcher.session, "get", return_value=Mock(content=b"response")),
        patch.object(
            fetcher, "_parse_response", side_effect=[([{"MONA_CD": "M1"}], 2), ([], 0)]
        ),
    ):
        frame = fetcher.fetch_data_generic(
            "https://example.com/api",
            {"pIndex": 1},
            fetcher.mapper_open_xml,
            format="xml",
        )
    assert len(frame) == 1
    assert frame.attrs == {
        "source_total_count": 2,
        "source_complete": False,
        "source_all_pages": True,
    }


def test_generic_paging_marks_complete_snapshot_after_last_page():
    fetcher = DataFetcher()
    with (
        patch.object(fetcher.session, "get", return_value=Mock(content=b"response")),
        patch.object(
            fetcher,
            "_parse_response",
            side_effect=[([{"MONA_CD": "M1"}], 2), ([{"MONA_CD": "M2"}], 2)],
        ),
    ):
        frame = fetcher.fetch_data_generic(
            "https://example.com/api",
            {"pIndex": 1},
            fetcher.mapper_open_xml,
            format="xml",
        )
    assert len(frame) == 2
    assert frame.attrs == {
        "source_total_count": 2,
        "source_complete": True,
        "source_all_pages": True,
    }
