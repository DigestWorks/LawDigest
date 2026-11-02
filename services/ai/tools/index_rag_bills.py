"""원문 스냅샷 검사 기본값은 읽기 전용이다. --apply는 별도 승인 뒤 실행한다."""

import argparse
from collections import Counter
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from lawdigest_ai.rag.embedding import EmbeddingGenerator  # noqa: E402
from lawdigest_ai.rag.indexing import (  # noqa: E402
    build_index,
    encode_snapshot,
    prepare_chunks,
    snapshot_hash,
)
from lawdigest_ai.rag.repository import BillRepository  # noqa: E402
from lawdigest_ai.rag.settings import RagSettings  # noqa: E402
from lawdigest_ai.rag.vector_store import VectorStore  # noqa: E402


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--snapshot", type=Path, help="기존 원문 스냅샷 검사/구축")
    parser.add_argument("--snapshot-out", type=Path, help="읽기 전용 DB 스냅샷 저장")
    parser.add_argument(
        "--apply", action="store_true", help="승인된 새 Qdrant 인덱스 구축"
    )
    parser.add_argument("--collection", help="새 lawdigest_rag_v1_* 컬렉션")
    parser.add_argument("--expected-sha256", help="승인받은 스냅샷의 SHA-256")
    parser.add_argument(
        "--activate", action="store_true", help="검증 후 활성 별칭 전환"
    )
    args = parser.parse_args(argv)
    if args.activate and not args.apply:
        parser.error("--activate는 --apply와 함께 지정해야 합니다.")
    if args.apply and (
        not args.snapshot or not args.expected_sha256 or not args.collection
    ):
        parser.error(
            "--apply에는 --snapshot, --expected-sha256, --collection이 필요합니다."
        )
    settings = RagSettings.from_env()
    repository = BillRepository(settings.db_mode)
    rows = (
        json.loads(args.snapshot.read_text())
        if args.snapshot
        else repository.snapshot()
    )
    digest = snapshot_hash(rows)
    if args.expected_sha256 and digest != args.expected_sha256:
        raise ValueError("스냅샷 해시가 승인 대상과 다릅니다.")
    chunks = prepare_chunks(rows, settings.embedding_model)
    report = dict(
        mode="apply" if args.apply else "dry_run",
        bill_count=len(rows),
        counts_by_assembly=dict(Counter(str(r["assembly_number"]) for r in rows)),
        chunk_count=len(chunks),
        snapshot_sha256=digest,
        embedding_model=settings.embedding_model,
    )
    if args.snapshot_out:
        # 기존 스냅샷을 덮어쓰지 않는다.
        with args.snapshot_out.open("xb") as output:
            output.write(encode_snapshot(rows))
    if args.apply:
        # 부분·구형 표본을 전체 출시 인덱스로 활성화하지 않는다.
        if snapshot_hash(repository.snapshot()) != digest:
            raise ValueError(
                "현재 READY 원문 전체와 승인 스냅샷이 다릅니다. 다시 dry_run 해 주세요."
            )
        store = VectorStore(url=settings.qdrant_url, api_key=settings.qdrant_key)
        if store.client is None:
            raise RuntimeError("Qdrant를 사용할 수 없습니다.")
        try:
            from openai import OpenAI

            llm = OpenAI(
                api_key=settings.openai_key,
                base_url=settings.openai_base_url,
                timeout=30,
                max_retries=1,
            )
            report["manifest"] = build_index(
                store.client,
                EmbeddingGenerator(model_name=settings.embedding_model, client=llm),
                settings,
                rows,
                args.collection,
                activate=args.activate,
            )
        finally:
            store.client.close()
    print(json.dumps(report, ensure_ascii=False, default=str))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        # 라이브러리 예외 원문에는 연결 문자열이 포함될 수 있다.
        print(
            f"인덱스 작업 실패: {type(error).__name__}. DB·별칭을 확인하고 dry_run부터 다시 진행하세요.",
            file=sys.stderr,
        )
        raise SystemExit(1) from None
