"""고정된 공개 E5 모델 파일을 내려받아 해시를 검증한다. DB에는 연결하지 않는다."""

import argparse
import json
import os
from pathlib import Path
import sys
from tempfile import NamedTemporaryFile
from urllib.request import urlopen

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from lawdigest_ai.rag.local_embedding import (  # noqa: E402
    E5_DIMENSIONS,
    E5_FILES,
    E5_MODEL_ID,
    E5_REPO,
    E5_REVISION,
    verify_model_file,
)


def prepare(directory):
    directory.mkdir(parents=True, exist_ok=True, mode=0o700)
    for filename, (remote, size, _) in E5_FILES.items():
        target = directory / filename
        if target.exists():
            verify_model_file(target, filename)
            continue
        temporary = None
        try:
            with NamedTemporaryFile(
                dir=directory, suffix=".partial", delete=False
            ) as output:
                temporary = Path(output.name)
                url = f"https://huggingface.co/{E5_REPO}/resolve/{E5_REVISION}/{remote}"
                with urlopen(url, timeout=90) as response:
                    remaining = size
                    while remaining:
                        data = response.read(min(1024 * 1024, remaining))
                        if not data:
                            break
                        output.write(data)
                        remaining -= len(data)
                    if remaining or response.read(1):
                        raise ValueError("공개 모델 파일 크기가 예상과 다릅니다.")
            verify_model_file(temporary, filename)
            try:
                os.link(temporary, target)
            except FileExistsError:
                verify_model_file(target, filename)
        finally:
            if temporary:
                temporary.unlink(missing_ok=True)
    return {
        "model": E5_MODEL_ID,
        "dimensions": E5_DIMENSIONS,
        "verified_files": len(E5_FILES),
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path, required=True)
    try:
        print(
            json.dumps(
                prepare(parser.parse_args().output_dir.resolve()), ensure_ascii=False
            )
        )
    except Exception as error:
        print(f"임베딩 모델 준비 실패: {type(error).__name__}", file=sys.stderr)
        raise SystemExit(1) from None
