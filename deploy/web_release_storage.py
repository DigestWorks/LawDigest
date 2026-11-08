#!/usr/bin/env python3
"""Maintain generated web releases before copying a new deployment."""

import argparse
import json
import os
from pathlib import Path
import re
import shutil
import subprocess

RESERVE_BYTES = 512 * 1024 * 1024
RELEASE_NAME = re.compile(r"\d{14}-[0-9a-f]{7,40}")


def prune_releases(runtime: Path, keep: int) -> int:
    if keep < 2:
        raise ValueError("최근 릴리스는 최소 2개를 보관해야 합니다.")
    root = runtime.resolve() / "releases"
    if root.is_symlink():
        raise ValueError("릴리스 루트는 일반 디렉터리여야 합니다.")
    folders = sorted(
        (path for path in root.iterdir()
         if RELEASE_NAME.fullmatch(path.name) and path.is_dir() and not path.is_symlink()),
        reverse=True,
    )
    protected = set(folders[:keep])
    for link in (runtime / "current", runtime / "previous"):
        if link.is_symlink():
            protected.add(link.resolve())
    processes = json.loads(subprocess.check_output(["pm2", "jlist"], text=True))
    for process in processes:
        cwd = process.get("pm2_env", {}).get("pm_cwd")
        if cwd:
            path = Path(cwd).resolve()
            protected.update(folder for folder in folders if folder == path or folder in path.parents)
    removed = 0
    for folder in folders:
        if folder not in protected:
            if folder.parent != root or folder.is_symlink() or folder.resolve() != folder:
                raise ValueError("릴리스 정리 경로가 변경됐습니다.")
            shutil.rmtree(folder)
            removed += 1
    return removed


def check_space(runtime: Path, source: Path) -> tuple[int, int]:
    if not source.is_dir():
        raise ValueError("웹 빌드 디렉터리를 찾을 수 없습니다.")
    block = os.statvfs(runtime).f_frsize
    required = RESERVE_BYTES
    for directory, names, files in os.walk(source, followlinks=False):
        if Path(directory) == source / ".next" / "cache":
            names[:] = [name for name in names if name != "webpack"]
        required += block
        links = [name for name in names if (Path(directory) / name).is_symlink()]
        for name in files + links:
            size = (Path(directory) / name).lstat().st_size
            required += ((size + block - 1) // block) * block
    free = shutil.disk_usage(runtime).free
    if free < required:
        raise ValueError(f"웹 복사 공간 부족. 필요 {required // 1024**2}MiB, 여유 {free // 1024**2}MiB")
    return required, free


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["prune", "check-space"])
    parser.add_argument("runtime", type=Path)
    parser.add_argument("--keep", type=int, default=6)
    parser.add_argument("--source", type=Path)
    args = parser.parse_args()
    try:
        if args.action == "prune":
            print(f"이전 웹 빌드 산출물 {prune_releases(args.runtime, args.keep)}개 정리")
        else:
            if args.source is None:
                parser.error("check-space에는 --source가 필요합니다.")
            required, free = check_space(args.runtime, args.source)
            print(f"웹 복사 공간 확인. 필요 {required // 1024**2}MiB, 여유 {free // 1024**2}MiB")
    except (OSError, ValueError, subprocess.CalledProcessError) as error:
        parser.exit(1, f"웹 릴리스 공간 점검 실패. {error}\n")


if __name__ == "__main__":
    main()
