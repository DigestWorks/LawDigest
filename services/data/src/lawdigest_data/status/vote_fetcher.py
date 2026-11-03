from __future__ import annotations

from collections import Counter
from datetime import date, datetime
import os
from typing import Any

from ..bills.DataFetcher import DataFetcher
from ..bills.open_assembly import OpenAssemblyBillClient


class VoteStatusFetcher:
    """Validate official plenary totals against the published roll call."""

    TOTAL_FIELDS = ("VOTE_TCNT", "YES_TCNT", "NO_TCNT", "BLANK_TCNT")
    BALLOT_RESULTS = ("찬성", "반대", "기권")

    def __init__(self, fetcher: DataFetcher | None = None):
        self.fetcher = fetcher or DataFetcher()

    def _verified_vote(
        self, client: OpenAssemblyBillClient, row: dict[str, Any], age: str, day: date,
    ) -> tuple[dict[str, Any], list[dict[str, Any]]]:
        bill_id = row["BILL_ID"]
        published = [int(row[key]) if row.get(key) is not None else None for key in self.TOTAL_FIELDS]
        members = client.fetch_rows(
            "nojepdqqaweusdfbi", {"AGE": age, "BILL_ID": bill_id},
            page_size=1000, require_complete=True,
        )
        ballots: Counter[str] = Counter()
        parties: Counter[str] = Counter()
        seen = set()
        for member in members:
            member_day = datetime.strptime(member["VOTE_DATE"], "%Y%m%d %H%M%S").date()
            code = member.get("MONA_CD")
            ballot = member.get("RESULT_VOTE_MOD")
            if (
                member.get("BILL_ID") != bill_id or str(member.get("BILL_NO")) != str(row["BILL_NO"])
                or str(member.get("AGE")) != age or member_day != day
                or not code or code in seen or ballot not in (*self.BALLOT_RESULTS, "불참")
            ):
                raise RuntimeError(f"Invalid individual vote record for {bill_id}")
            seen.add(code)
            ballots[ballot] += 1
            if ballot == "찬성":
                party = (member.get("POLY_NM") or "").strip()
                if not party:
                    raise RuntimeError(f"Missing party name in the roll call for {bill_id}")
                parties[party] += 1

        if members:
            counted = [ballots[ballot] for ballot in self.BALLOT_RESULTS]
            totals = [sum(counted), *counted]
            if any(value is not None and value != actual for value, actual in zip(published, totals)):
                raise RuntimeError(f"Individual vote totals disagree with the published result for {bill_id}")
        else:
            # Some official outcomes expose counts without publishing a roll call.
            if any(value is None for value in published):
                raise RuntimeError(f"Incomplete vote totals without a roll call for {bill_id}")
            totals = [int(value) for value in published]

        if totals[0] <= 0 or min(totals) < 0 or sum(totals[1:]) != totals[0]:
            raise RuntimeError(f"Invalid published vote totals for {bill_id}")
        return (
            {"BILL_ID": bill_id, **dict(zip(self.TOTAL_FIELDS, totals))},
            [{"BILL_ID": bill_id, "POLY_NM": name, "YES_TCNT": count} for name, count in sorted(parties.items())],
        )

    def fetch(self, start_date: str, end_date: str, age: str) -> dict[str, Any]:
        start, end = date.fromisoformat(start_date), date.fromisoformat(end_date)
        if start > end:
            raise ValueError("Invalid vote date range")
        client = self.fetcher._build_open_assembly_client(api_key=os.getenv("APIKEY_status"))
        if client is None:
            raise RuntimeError("Open Assembly vote API key is missing")

        rows = client.fetch_rows(
            "nwbpacrgavhjryiph", {"AGE": age}, page_size=1000, require_complete=True,
        )
        vote_rows = []
        party_rows = []
        seen = set()
        for row in rows:
            if row.get("BILL_KIND") != "법률안":
                continue
            day = date.fromisoformat(row["RGS_PROC_DT"])
            if not start <= day <= end:
                continue
            if str(row.get("AGE")) != age or not row.get("BILL_ID") or not row.get("BILL_NO"):
                raise RuntimeError("Invalid official plenary vote identity")
            if row.get("PROC_RESULT_CD") in {"철회", "폐기"} and all(
                row.get(key) is None for key in self.TOTAL_FIELDS
            ):
                continue
            if row["BILL_ID"] in seen:
                raise RuntimeError(f"Multiple vote records for {row['BILL_ID']} in the requested window")
            seen.add(row["BILL_ID"])
            vote, parties = self._verified_vote(client, row, age, day)
            vote_rows.append(vote)
            party_rows.extend(parties)

        return {
            "start_date": start_date,
            "end_date": end_date,
            "age": age,
            "source_checked": True,
            "vote_rows": vote_rows,
            "vote_party_rows": party_rows,
        }
