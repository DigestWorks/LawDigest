import json
from unittest.mock import Mock

import pytest

from lawdigest_data.bills.DataFetcher import DataFetcher
from lawdigest_data.bills.open_assembly import OpenAssemblyBillClient
from lawdigest_data.status.lifecycle_fetcher import LifecycleStatusFetcher
from lawdigest_data.status.projectors import BillLifecycleProjector


def test_complete_list_rejects_a_missing_second_page():
    session = Mock()
    first = {
        "test": [
            {"head": [{"list_total_count": 2}, {"RESULT": {"CODE": "INFO-000"}}]},
            {"row": [{"BILL_ID": "one"}]},
        ],
    }
    session.get.side_effect = [
        Mock(text=json.dumps(first)),
        Mock(text=json.dumps({"RESULT": {"CODE": "INFO-200"}})),
    ]
    with pytest.raises(RuntimeError, match="row count changed"):
        OpenAssemblyBillClient(session, "fixture").fetch_rows("test", require_complete=True, page_size=1)
    assert [call.kwargs["params"]["pIndex"] for call in session.get.call_args_list][-1] == 2


def test_lifecycle_discovers_recent_events_on_older_bills_and_reads_detail_by_number():
    client = Mock()
    base = {"BILL_ID": "bill", "BILL_NO": "2200001"}
    lists = {
        "BILLRCP": [{**base, "ERACO": "제22대", "BILL_KIND": "법률안", "PPSL_DT": "2025-01-01"}],
        "nwbqublzajtcqpdae": [],
        "nzpltgfqabtcpsmai": [],
        "nwbpacrgavhjryiph": [{
            **base, "AGE": 22, "PROPOSE_DT": "2025-01-01", "RGS_PROC_DT": "2026-10-28",
        }],
        "BILLJUDGE": [],
    }
    client.fetch_rows.side_effect = lambda endpoint, *args, **kwargs: lists[endpoint]
    detail = {
        **base, "ERACO": "제22대", "BILL_KND": "법률안", "PPSL_DT": "2025-01-01",
        "JRCMIT_NM": "정무위원회", "JRCMIT_CMMT_DT": "2026-10-28",
        "RGS_PRSNT_DT": "2026-10-27", "RGS_RSLN_DT": "2026-10-28",
        "RGS_CONF_RSLT": "원안가결",
    }
    client.fetch_bill_lifecycle.return_value = detail
    fetcher = DataFetcher()
    fetcher._build_open_assembly_client = Mock(return_value=client)

    service = LifecycleStatusFetcher(fetcher)
    result = BillLifecycleProjector().project(service.fetch("2026-10-28", "2026-10-28", "22"))
    client.fetch_bill_lifecycle.assert_called_once_with("2200001")
    assert len(client.fetch_rows.call_args_list) == 4
    assert all(call.kwargs["require_complete"] for call in client.fetch_rows.call_args_list)
    plenary = [row for row in result["events"] if row["stage"] == "본회의 심의"]
    assert len(plenary) == 1
    assert plenary[0]["status_update_date"] == "2026-10-28"
    assert plenary[0]["bill_result"] == "원안가결"
    assert result["updates"][0]["stage"] == "본회의 심의"

    client.fetch_bill_lifecycle.return_value = {**detail, "BILL_ID": "other"}
    with pytest.raises(RuntimeError, match="ALLBILL identity mismatch"):
        service.fetch("2026-10-28", "2026-10-28", "22")



def test_pending_proposal_can_add_receipt_before_detail_is_published():
    client = Mock()
    proposal = {
        "BILL_ID": "new", "BILL_NO": "2222454", "AGE": "22",
        "BILL_NAME": "신규 법률안", "PROPOSE_DT": "2026-11-03",
    }
    lists = {
        "BILLRCP": [], "nwbqublzajtcqpdae": [proposal],
        "nzpltgfqabtcpsmai": [], "nwbpacrgavhjryiph": [],
    }
    client.fetch_rows.side_effect = lambda endpoint, *args, **kwargs: lists[endpoint]
    client.fetch_bill_lifecycle.return_value = None
    fetcher = DataFetcher()
    fetcher._build_open_assembly_client = Mock(return_value=client)
    service = LifecycleStatusFetcher(fetcher)

    result = BillLifecycleProjector().project(service.fetch("2026-11-02", "2026-11-04", "22"))
    assert result["updates"] == []
    assert len(result["events"]) == 1
    event = result["events"][0]
    assert (event["bill_id"], event["stage"], event["status_update_date"], event["timeline_only"]) == (
        "new", "접수", "2026-11-03", True,
    )

    proposal["COMMITTEE_DT"] = "2026-11-04"
    with pytest.raises(RuntimeError, match="ALLBILL identity mismatch"):
        service.fetch("2026-11-02", "2026-11-04", "22")
