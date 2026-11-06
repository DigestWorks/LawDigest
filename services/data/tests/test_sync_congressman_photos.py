from __future__ import annotations

import importlib.util
from pathlib import Path
from unittest.mock import patch

import pytest

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "db" / "sync_congressman_photos.py"
spec = importlib.util.spec_from_file_location("sync_congressman_photos", SCRIPT)
photos = importlib.util.module_from_spec(spec)
spec.loader.exec_module(photos)

MEMBER = {
    "congressman_id": "2KM3589W",
    "congressman_name": "손솔",
    "congressman_image_url": "/congressman/22/2KM3589W.jpg",
}


def test_fetch_members_reads_every_page():
    pages = [
        {"data": {"congressman_list": [MEMBER], "pagination_response": {"last_page": False}}},
        {"data": {"congressman_list": [MEMBER], "pagination_response": {"last_page": True}}},
    ]
    assert len(photos.fetch_members(lambda url: pages.pop(0))) == 2


def test_find_missing_skips_invalid_paths_and_existing_photos():
    other = {**MEMBER, "congressman_id": "JC14718Q", "congressman_image_url": "/congressman/22/JC14718Q.jpg"}
    invalid = {**MEMBER, "congressman_image_url": "../secret.jpg"}
    missing = photos.find_missing([MEMBER, other, invalid], exists=lambda path: "JC14718Q" in path)
    assert missing == [MEMBER]


def _members_response(rows):
    return {"ALLNAMEMBER": [{"head": []}, {"row": rows}]}


def test_official_photo_url_matches_member_code():
    rows = [
        {"NAAS_CD": "OTHER000", "NAAS_PIC": "https://www.assembly.go.kr/other.jpg"},
        {"NAAS_CD": "2KM3589W", "NAAS_PIC": "https://www.assembly.go.kr/static/portal/img/openassm/2KM3589W.jpg"},
    ]
    assert photos.official_photo_url(MEMBER, lambda url: _members_response(rows)).endswith("2KM3589W.jpg")


def test_official_photo_url_rejects_other_hosts_and_unknown_codes():
    foreign = [{"NAAS_CD": "2KM3589W", "NAAS_PIC": "https://example.com/a.jpg"}]
    with pytest.raises(ValueError):
        photos.official_photo_url(MEMBER, lambda url: _members_response(foreign))
    with pytest.raises(ValueError):
        photos.official_photo_url(MEMBER, lambda url: _members_response([]))


class _Response:
    def __init__(self, content):
        self.content = content

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def read(self, size):
        return self.content[:size]


def test_download_photo_rejects_non_jpeg():
    with patch.object(photos, "_open", return_value=_Response(b"<html>")), pytest.raises(ValueError):
        photos.download_photo("https://www.assembly.go.kr/a.jpg")
    with patch.object(photos, "_open", return_value=_Response(b"\xff\xd8abc")):
        assert photos.download_photo("https://www.assembly.go.kr/a.jpg") == b"\xff\xd8abc"


def test_upload_photo_never_overwrites():
    with patch.object(photos.subprocess, "run") as run:
        photos.upload_photo(MEMBER["congressman_image_url"], b"\xff\xd8", oci_bin="oci")
    command = run.call_args.args[0]
    assert "--no-overwrite" in command
    assert command[command.index("--name") + 1] == "congressman/22/2KM3589W.jpg"


def test_sync_dry_run_uploads_nothing(capsys):
    with (
        patch.object(photos, "fetch_members", return_value=[MEMBER]),
        patch.object(photos, "find_missing", return_value=[MEMBER]),
        patch.object(photos, "upload_photo") as upload,
    ):
        assert photos.sync(execute=False) == 0
    upload.assert_not_called()
    assert "손솔" in capsys.readouterr().out


def test_sync_reports_failure_exit_code():
    with (
        patch.object(photos, "fetch_members", return_value=[MEMBER]),
        patch.object(photos, "find_missing", return_value=[MEMBER]),
        patch.object(photos, "official_photo_url", side_effect=ValueError("없음")),
    ):
        assert photos.sync(execute=True, oci_bin="oci") == 1
