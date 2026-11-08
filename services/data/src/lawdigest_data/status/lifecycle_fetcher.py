from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List

from ..bills.DataFetcher import DataFetcher


class LifecycleStatusFetcher:
    """Fetch lifecycle-oriented bill status snapshots from open assembly."""

    DATE_KEYS = (
        "PROM_DT",
        "GVRN_TRSF_DT",
        "RGS_RSLN_DT",
        "RGS_PRSNT_DT",
        "LAW_PROC_DT",
        "LAW_PRSNT_DT",
        "LAW_CMMT_DT",
        "JRCMIT_PROC_DT",
        "JRCMIT_PRSNT_DT",
        "JRCMIT_CMMT_DT",
        "PROC_DT",
        "PPSL_DT",
    )

    REVIEW_DATE_KEYS = (
        "PROPOSE_DT", "COMMITTEE_DT", "CMT_PRESENT_DT", "CMT_PROC_DT",
        "LAW_SUBMIT_DT", "LAW_PRESENT_DT", "LAW_PROC_DT", "PROC_DT",
    )
    PLENARY_DATE_KEYS = (
        "PROPOSE_DT", "COMMITTEE_SUBMIT_DT", "COMMITTEE_PRESENT_DT", "COMMITTEE_PROC_DT",
        "LAW_SUBMIT_DT", "LAW_PRESENT_DT", "LAW_PROC_DT", "RGS_PRESENT_DT",
        "RGS_PROC_DT", "CURR_TRANS_DT", "ANNOUNCE_DT",
    )

    def __init__(self, fetcher: DataFetcher | None = None):
        self.fetcher = fetcher or DataFetcher()

    @staticmethod
    def _normalize_date(value: str | None) -> str | None:
        if not value:
            return None
        text = str(value).strip()
        if not text:
            return None
        for fmt in ("%Y-%m-%d", "%Y.%m.%d"):
            try:
                return datetime.strptime(text, fmt).strftime("%Y-%m-%d")
            except ValueError:
                continue
        return None

    @staticmethod
    def _should_backfill_review(row: Dict[str, Any]) -> bool:
        return not any(
            row.get(key)
            for key in (
                "JRCMIT_NM",
                "CURR_COMMITTEE",
                "JRCMIT_PRSNT_DT",
                "JRCMIT_PROC_DT",
                "LAW_PRSNT_DT",
                "LAW_PROC_DT",
            )
        )

    def fetch(self, start_date: str, end_date: str, age: str) -> Dict[str, Any]:
        start_bound = datetime.strptime(start_date, "%Y-%m-%d").date()
        end_bound = datetime.strptime(end_date, "%Y-%m-%d").date()
        client = self.fetcher._build_open_assembly_client()
        if client is None:
            raise RuntimeError("Open Assembly lifecycle API key is missing")

        assembly = f"제{age}대"
        receipts = client.fetch_rows("BILLRCP", {"ERACO": assembly}, page_size=1000, require_complete=True)
        receipts_by_id = {row["BILL_ID"]: row for row in receipts}
        if len(receipts_by_id) != len(receipts):
            raise RuntimeError("BILLRCP contains duplicate bill IDs")

        # A current event can belong to a much older proposal. Read every page of
        # each source, including lists whose ordering varies across requests.
        candidates: Dict[str, str] = {}
        pending = client.fetch_rows("nwbqublzajtcqpdae", {"AGE": age}, page_size=1000, require_complete=True)
        processed = client.fetch_rows("nzpltgfqabtcpsmai", {"AGE": age}, page_size=1000, require_complete=True)
        plenary = client.fetch_rows("nwbpacrgavhjryiph", {"AGE": age}, page_size=1000, require_complete=True)
        pending_by_id = {row.get("BILL_ID"): row for row in pending}
        later_stage_ids = {row.get("BILL_ID") for rows in (processed, plenary) for row in rows}
        sources = (
            (receipts, ("PPSL_DT",)),
            (pending, self.REVIEW_DATE_KEYS),
            (processed, self.REVIEW_DATE_KEYS),
            (plenary, self.PLENARY_DATE_KEYS),
        )
        for rows, keys in sources:
            for row in rows:
                if row.get("AGE") is not None and str(row["AGE"]) != age:
                    continue
                dates = (self.fetcher._parse_api_date(row.get(key)) for key in keys)
                if not any(day is not None and start_bound <= day <= end_bound for day in dates):
                    continue
                bill_id = str(row.get("BILL_ID") or "").strip()
                receipt = receipts_by_id.get(bill_id)
                if (receipt or row).get("BILL_KIND") not in (None, "법률안"):
                    continue
                bill_no = str(row.get("BILL_NO") or "").strip()
                if not bill_id or not bill_no or candidates.get(bill_id, bill_no) != bill_no:
                    raise RuntimeError("Official lifecycle lists disagree on a bill identity")
                if receipt and (str(receipt["BILL_NO"]) != bill_no or receipt["ERACO"] != assembly):
                    raise RuntimeError(f"BILLRCP identity mismatch for {bill_no}")
                candidates[bill_id] = bill_no

        deduped: Dict[str, Dict[str, Any]] = {}
        for bill_id, bill_no in candidates.items():
            row = client.fetch_bill_lifecycle(bill_no)
            if row is None and bill_id not in later_stage_ids:
                proposal = pending_by_id.get(bill_id, {})
                date = self.fetcher._parse_api_date(proposal.get("PROPOSE_DT"))
                official_receipt = receipts_by_id.get(bill_id)
                receipt_date = self.fetcher._parse_api_date(official_receipt.get("PPSL_DT")) if official_receipt else date
                if (
                    str(proposal.get("AGE")) == age
                    and str(proposal.get("BILL_NO")) == bill_no
                    and proposal.get("BILL_NAME")
                    and date is not None and date == receipt_date and start_bound <= date <= end_bound
                    and not any(proposal.get(key) for key in self.REVIEW_DATE_KEYS[1:])
                    and not proposal.get("PROC_RESULT_CD")
                    and not proposal.get("PROC_RSLT")
                ):
                    deduped[bill_id] = {
                        "BILL_ID": bill_id,
                        "BILL_NO": bill_no,
                        "BILL_NAME": proposal["BILL_NAME"],
                        "AGE": age,
                        "PPSL_DT": date.isoformat(),
                        "receipt_only": True,
                    }
                    continue
            if (
                not row or row.get("BILL_ID") != bill_id
                or str(row.get("BILL_NO")) != bill_no or row.get("ERACO") != assembly
            ):
                raise RuntimeError(f"ALLBILL identity mismatch or missing detail for {bill_no}")
            if row.get("BILL_KND") != "법률안":
                continue
            normalized = {**row, "AGE": age}
            for key in self.DATE_KEYS:
                if key in normalized:
                    normalized[key] = self._normalize_date(normalized.get(key))
            deduped[bill_id] = normalized

        review_rows: Dict[str, List[Dict[str, Any]]] = {}
        for bill_id, row in deduped.items():
            if row.get("receipt_only") or not self._should_backfill_review(row):
                continue
            bill_no = str(row.get("BILL_NO") or "").strip()
            if not bill_no:
                continue
            try:
                supplemental = client.fetch_rows("BILLJUDGE", {"BILL_NO": bill_no}, all_pages=False, page_size=20)
            except Exception:
                supplemental = []
            matching = [
                item for item in supplemental
                if item.get("BILL_ID") == bill_id and str(item.get("BILL_NO")) == bill_no
            ]
            if matching:
                review_rows[bill_id] = matching

        return {
            "start_date": start_date,
            "end_date": end_date,
            "age": age,
            "source_checked": True,
            "rows": list(deduped.values()),
            "review_rows": review_rows,
        }
