#!/usr/bin/env python3
"""버킷에 없는 의원 사진을 국회 공식 경로에서 받아 올린다.

공개 의원 목록의 이미지 경로를 공개 URL로 확인하고, 404인 사진만
국회 열린데이터 ALLNAMEMBER의 NAAS_PIC에서 받아 덮어쓰기 없이 올린다.
기본 실행은 누락 목록만 출력한다. 실제 업로드에는 oci CLI 설정이 필요하다.

사용:
  python sync_congressman_photos.py            # 누락 목록 출력
  python sync_congressman_photos.py --execute  # 누락분 업로드
"""
from __future__ import annotations

import argparse
import concurrent.futures
import json
import os
import re
import shutil
import subprocess
import tempfile
import urllib.error
import urllib.parse
import urllib.request
from collections.abc import Callable
from pathlib import Path
from typing import Any

API_BASE = "https://api.lawdigest.kr/v1"
NAMESPACE = "axv8wzohklg1"
BUCKET = "lawDigestBucket"
STORAGE_BASE = f"https://objectstorage.ap-chuncheon-1.oraclecloud.com/n/{NAMESPACE}/b/{BUCKET}/o"
# 출처: 열린국회정보 ALLNAMEMBER(https://open.assembly.go.kr/portal/openapi/ALLNAMEMBER)
MEMBER_API = "https://open.assembly.go.kr/portal/openapi/ALLNAMEMBER"
OFFICIAL_PHOTO_PREFIX = "https://www.assembly.go.kr/"
IMAGE_PATH = re.compile(r"/congressman/\d+/[A-Z0-9]{8}\.jpg")
MAX_PHOTO_BYTES = 5 * 1024 * 1024
HEADERS = {"User-Agent": "lawdigest-photo-sync"}


def _open(url: str, *, method: str = "GET") -> Any:
    return urllib.request.urlopen(urllib.request.Request(url, method=method, headers=HEADERS), timeout=25)


def _get_json(url: str) -> Any:
    with _open(url) as response:
        return json.load(response)


def fetch_members(get_json: Callable[[str], Any] = _get_json) -> list[dict[str, Any]]:
    members: list[dict[str, Any]] = []
    page = 0
    while True:
        data = get_json(f"{API_BASE}/congressman/list?page={page}&size=50")["data"]
        members.extend(data["congressman_list"])
        if data["pagination_response"]["last_page"]:
            return members
        page += 1


def photo_exists(image_path: str) -> bool:
    try:
        with _open(STORAGE_BASE + image_path, method="HEAD"):
            return True
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            return False
        raise


def find_missing(
    members: list[dict[str, Any]],
    exists: Callable[[str], bool] = photo_exists,
) -> list[dict[str, Any]]:
    valid = [member for member in members if IMAGE_PATH.fullmatch(str(member.get("congressman_image_url") or ""))]
    with concurrent.futures.ThreadPoolExecutor(8) as executor:
        results = list(executor.map(lambda member: exists(member["congressman_image_url"]), valid))
    return [member for member, found in zip(valid, results) if not found]


def official_photo_url(member: dict[str, Any], get_json: Callable[[str], Any] = _get_json) -> str:
    query = {"Type": "json", "pIndex": 1, "pSize": 100, "NAAS_NM": member["congressman_name"]}
    api_key = os.getenv("ASSEMBLY_API_KEY")
    if api_key:
        query["KEY"] = api_key
    rows = get_json(f"{MEMBER_API}?{urllib.parse.urlencode(query)}")["ALLNAMEMBER"][1]["row"]
    for row in rows:
        if row.get("NAAS_CD") == member["congressman_id"]:
            url = str(row.get("NAAS_PIC") or "")
            if url.startswith(OFFICIAL_PHOTO_PREFIX):
                return url
            raise ValueError(f"공식 사진 경로가 아닙니다: {url}")
    raise ValueError(f"공식 명단에 없습니다: {member['congressman_id']}")


def download_photo(url: str) -> bytes:
    with _open(url) as response:
        content = response.read(MAX_PHOTO_BYTES + 1)
    if not content.startswith(b"\xff\xd8") or len(content) > MAX_PHOTO_BYTES:
        raise ValueError(f"JPEG 사진이 아닙니다: {url}")
    return content


def upload_photo(image_path: str, content: bytes, *, oci_bin: str) -> None:
    with tempfile.TemporaryDirectory(prefix="lawdigest-photo-") as tmp_dir:
        local = Path(tmp_dir) / "photo.jpg"
        local.write_bytes(content)
        subprocess.run(
            [
                oci_bin, "os", "object", "put",
                "--namespace-name", NAMESPACE,
                "--bucket-name", BUCKET,
                "--name", image_path.lstrip("/"),
                "--file", str(local),
                "--content-type", "image/jpeg",
                "--no-overwrite",
            ],
            check=True,
            capture_output=True,
            text=True,
        )


def sync(*, execute: bool, oci_bin: str | None = None) -> int:
    missing = find_missing(fetch_members())
    print(f"누락 {len(missing)}건")
    failed = 0
    for member in missing:
        label = f"{member['congressman_id']} {member['congressman_name']}"
        if not execute:
            print(f"- {label}")
            continue
        try:
            upload_photo(
                member["congressman_image_url"],
                download_photo(official_photo_url(member)),
                oci_bin=oci_bin or "oci",
            )
            print(f"업로드 {label}")
        except (OSError, ValueError, KeyError, IndexError, subprocess.CalledProcessError) as exc:
            failed += 1
            print(f"실패 {label}: {exc}")
    return 1 if failed else 0


def main() -> int:
    parser = argparse.ArgumentParser(description="누락된 의원 사진 동기화")
    parser.add_argument("--execute", action="store_true", help="누락 사진 업로드(기본은 목록 출력)")
    args = parser.parse_args()
    oci_bin = shutil.which("oci") or shutil.which(str(Path.home() / ".local/bin/oci"))
    if args.execute and not oci_bin:
        parser.error("oci CLI를 찾을 수 없습니다.")
    return sync(execute=args.execute, oci_bin=oci_bin)


if __name__ == "__main__":
    raise SystemExit(main())
