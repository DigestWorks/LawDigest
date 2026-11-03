from unittest.mock import Mock, patch

import pytest

from lawdigest_data.runtime.pipeline import PipelineRuntime
from lawdigest_data.status.vote_fetcher import VoteStatusFetcher


def test_plenary_list_distinguishes_withdrawal_and_api_failure():
    client = Mock()
    fetcher = VoteStatusFetcher(Mock(_build_open_assembly_client=Mock(return_value=client)))
    client.fetch_rows.return_value = [{
        "BILL_ID": "withdrawn", "BILL_NO": "2220000", "BILL_KIND": "법률안",
        "RGS_PROC_DT": "2026-11-03", "AGE": 22, "PROC_RESULT_CD": "철회",
    }]
    payload = fetcher.fetch("2026-11-02", "2026-11-03", "22")
    assert payload["source_checked"] is True
    assert payload["vote_rows"] == payload["vote_party_rows"] == []
    client.fetch_rows.assert_called_once_with(
        "nwbpacrgavhjryiph", {"AGE": "22"}, page_size=1000, require_complete=True,
    )

    client.fetch_rows.side_effect = RuntimeError("official API unavailable")
    with pytest.raises(RuntimeError, match="official API unavailable"):
        fetcher.fetch("2026-11-02", "2026-11-03", "22")


def test_roll_call_confirms_omitted_zero_and_rejects_disagreeing_totals():
    client = Mock()
    fetcher = VoteStatusFetcher(Mock(_build_open_assembly_client=Mock(return_value=client)))
    summary = {
        "BILL_ID": "plenary", "BILL_NO": "2220001", "BILL_KIND": "법률안",
        "RGS_PROC_DT": "2026-11-03", "AGE": 22, "PROC_RESULT_CD": "원안가결",
        "VOTE_TCNT": 2, "YES_TCNT": 2, "NO_TCNT": None, "BLANK_TCNT": None,
    }
    member = {
        "BILL_ID": "plenary", "BILL_NO": "2220001", "VOTE_DATE": "20261103 151000", "AGE": 22,
        "RESULT_VOTE_MOD": "찬성", "POLY_NM": "정당",
    }
    members = [{**member, "MONA_CD": "one"}, {**member, "MONA_CD": "two"}]
    client.fetch_rows.side_effect = [[summary], members]
    result = fetcher.fetch("2026-11-03", "2026-11-03", "22")
    assert result["vote_rows"] == [
        {"BILL_ID": "plenary", "VOTE_TCNT": 2, "YES_TCNT": 2, "NO_TCNT": 0, "BLANK_TCNT": 0},
    ]
    assert result["vote_party_rows"] == [{"BILL_ID": "plenary", "POLY_NM": "정당", "YES_TCNT": 2}]

    client.fetch_rows.side_effect = [[{**summary, "YES_TCNT": 1}], members]
    with pytest.raises(RuntimeError, match="vote totals disagree"):
        fetcher.fetch("2026-11-03", "2026-11-03", "22")


@pytest.mark.parametrize(
    ("published", "expected"),
    [
        ((168, 168, None, None), (168, 168, 0, 0)),
        ((166, 164, None, 2), (166, 164, 0, 2)),
        ((166, 160, None, 2), (166, 160, 4, 2)),
        ((168, 160, None, None), None),
        ((None, 168, 0, 0), None),
    ],
)
def test_published_vote_totals_only_fill_uniquely_determined_counts(published, expected):
    client = Mock()
    fetcher = VoteStatusFetcher(Mock(_build_open_assembly_client=Mock(return_value=client)))
    fields = dict(zip(fetcher.TOTAL_FIELDS, published))
    summary = {
        "BILL_ID": "plenary", "BILL_NO": "2220001", "BILL_KIND": "법률안",
        "RGS_PROC_DT": "2026-11-03", "AGE": 22, "PROC_RESULT_CD": "수정가결",
        **fields,
    }
    client.fetch_rows.side_effect = [[summary], []]
    if expected is None:
        with pytest.raises(RuntimeError, match="Incomplete vote totals"):
            fetcher.fetch("2026-11-03", "2026-11-03", "22")
        return

    result = fetcher.fetch("2026-11-03", "2026-11-03", "22")
    assert result["vote_rows"] == [{"BILL_ID": "plenary", **dict(zip(fetcher.TOTAL_FIELDS, expected))}]
    assert result["vote_party_rows"] == []


def test_status_sync_marks_only_verified_empty_sources_as_success(tmp_path):
    manager = Mock()
    manager.fetch_lifecycle_step.return_value = {"artifact_path": None, "verified_empty": True}
    manager.fetch_vote_step.return_value = {"artifact_path": None, "verified_empty": True}
    manager.update_lawmakers_data.return_value = {"count": 299}
    runtime = PipelineRuntime(log_dir=tmp_path)
    with patch("lawdigest_data.runtime.pipeline._build_workflow_manager", return_value=manager):
        result = runtime.run_bill_status_sync()
        assert result["status"] == "success"
        assert result["steps"][-1]["result"]["reason"] == "verified_no_changes"

        manager.fetch_vote_step.return_value = {"artifact_path": None}
        assert runtime.run_bill_status_sync()["status"] == "empty"

        manager.reset_mock()
        manager.fetch_lifecycle_step.return_value = {"artifact_path": "lifecycle.json"}
        manager.fetch_vote_step.side_effect = RuntimeError("official API unavailable")
        with pytest.raises(RuntimeError, match="official API unavailable"):
            runtime.run_bill_status_sync(mode="prod")
        manager.update_lawmakers_data.assert_not_called()
        manager.upsert_lifecycle_step.assert_not_called()
        manager.upsert_vote_step.assert_not_called()
