"""검증된 스냅샷으로 새 버전의 인덱스를 만들고 마지막에 활성화한다."""

from collections import Counter
from datetime import datetime, timezone
import hashlib
import json
import re
import uuid

import tiktoken
from qdrant_client import models

from lawdigest_ai.rag.local_embedding import E5_CONTEXT, load_local_tokenizer
from lawdigest_ai.rag.repository import content_hash

SCHEMA_VERSION = 1
NAMESPACE = uuid.UUID("3996a287-0809-49d3-891f-c5173447a572")
MANIFEST_ID = str(uuid.uuid5(NAMESPACE, "manifest"))


def encode_snapshot(rows):
    return json.dumps(rows, ensure_ascii=False, sort_keys=True, default=str).encode()


def snapshot_hash(rows):
    return hashlib.sha256(encode_snapshot(rows)).hexdigest()


def chunk_text(text, count_tokens, max_tokens=700, overlap_chars=100):
    """토큰 제한을 지키면서 유니코드 문자를 중간에서 자르지 않는다."""
    position = 0
    while position < len(text):
        end = min(position + 1400, len(text))
        while count_tokens(text[position:end]) > max_tokens:
            if end - position <= 1:
                raise ValueError("원문 청크의 토큰 제한이 너무 작습니다.")
            end = position + max(1, int((end - position) * 0.8))
        if end < len(text):
            boundary = text.rfind("\n", position + (end - position) // 2, end)
            if boundary > position:
                end = boundary
        chunk = text[position:end].strip()
        if chunk:
            yield chunk
        if end == len(text):
            break
        position = max(position + 1, end - min(overlap_chars, (end - position) // 4))


def prepare_chunks(rows, settings):
    local = settings.embedding_backend == "e5"
    tokenizer = (
        load_local_tokenizer(settings.embedding_dir)
        if local
        else tiktoken.encoding_for_model(settings.embedding_model)
    )

    def count_tokens(text):
        if local:
            return len(tokenizer.encode(text, add_special_tokens=False).ids)
        return len(tokenizer.encode(text))

    chunks = []
    ids = set()
    for row in rows:
        bill_id = row.get("bill_id")
        if (
            not isinstance(bill_id, str)
            or not re.fullmatch(r"[A-Za-z0-9_-]{1,100}", bill_id)
            or bill_id in ids
        ):
            raise ValueError("인덱스 스냅샷 법안 ID가 올바르지 않거나 중복됐습니다.")
        ids.add(bill_id)
        if (
            int(row.get("assembly_number", 0)) not in (21, 22)
            or not str(row.get("summary") or "").strip()
        ):
            raise ValueError("원문과 대수가 확인되지 않은 법안입니다.")
        header = f"법안명: {str(row['bill_name'])[:220]}\n발의일: {row['propose_date']}\n대수: {row['assembly_number']}\n"
        budget = (
            min(440, E5_CONTEXT - count_tokens(f"passage: {header}") - 8)
            if local
            else 700
        )
        if budget < 64:
            raise ValueError("법안의 검색 메타데이터가 너무 깁니다.")
        for number, text in enumerate(
            chunk_text(row["summary"], count_tokens, max_tokens=budget)
        ):
            chunks.append(
                {
                    "id": str(uuid.uuid5(NAMESPACE, f"{bill_id}:{number}")),
                    "embedding_text": header + text,
                    "payload": {
                        "kind": "bill_chunk",
                        "schema_version": SCHEMA_VERSION,
                        "embedding_model": settings.embedding_model,
                        "bill_id": bill_id,
                        "source_hash": content_hash(row),
                        "assembly_number": int(row["assembly_number"]),
                        "text": text,
                    },
                }
            )
    return chunks


def chunk_filter(assembly=0, model=None):
    conditions = [
        models.FieldCondition(key="kind", match=models.MatchValue(value="bill_chunk")),
        models.FieldCondition(
            key="schema_version", match=models.MatchValue(value=SCHEMA_VERSION)
        ),
    ]
    if assembly:
        conditions.append(
            models.FieldCondition(
                key="assembly_number", match=models.MatchValue(value=assembly)
            )
        )
    if model:
        conditions.append(
            models.FieldCondition(
                key="embedding_model", match=models.MatchValue(value=model)
            )
        )
    return models.Filter(must=conditions)


def read_manifest(client, collection, settings):
    records = client.retrieve(
        collection, ids=[MANIFEST_ID], with_payload=True, with_vectors=False
    )
    if not records:
        raise ValueError("검증된 인덱스 메타데이터가 없습니다.")
    manifest = records[0].payload or {}
    if (
        manifest.get("kind") != "manifest"
        or manifest.get("state") != "ready"
        or manifest.get("schema_version") != SCHEMA_VERSION
        or manifest.get("embedding_model") != settings.embedding_model
        or manifest.get("dimensions") != settings.dimensions
    ):
        raise ValueError("인덱스 모델·스키마 또는 구축 상태를 확인할 수 없습니다.")
    if (
        not manifest.get("bill_count")
        or sum(manifest.get("counts_by_assembly", {}).values())
        != manifest["bill_count"]
    ):
        raise ValueError("인덱스 범위가 올바르지 않습니다.")
    vectors = client.get_collection(collection).config.params.vectors
    if getattr(vectors, "size", None) != settings.dimensions:
        raise ValueError("인덱스 벡터 차원이 다릅니다.")
    return manifest


def build_index(
    client,
    embedder,
    settings,
    rows,
    collection,
    *,
    activate=False,
    batch_size=32,
    expected_chunks=None,
):
    if not re.fullmatch(r"lawdigest_rag_v1_[a-z0-9_-]+", collection):
        raise ValueError("새 질의응답 버전 컬렉션만 생성할 수 있습니다.")
    if not rows or not 1 <= batch_size <= 64:
        raise ValueError("법안 스냅샷과 배치 크기를 확인해 주세요.")
    if client.collection_exists(collection):
        raise ValueError(
            "이미 있는 컬렉션을 재생성하지 않습니다. 새 버전 이름을 사용하세요."
        )
    if activate:
        if (
            not re.fullmatch(r"lawdigest_rag_[a-z0-9_-]+", settings.collection)
            or settings.collection == collection
        ):
            raise ValueError("질의응답 전용 활성 별칭을 확인해 주세요.")
        aliases = {alias.alias_name for alias in client.get_aliases().aliases}
        if settings.collection not in aliases and client.collection_exists(
            settings.collection
        ):
            raise ValueError("활성 별칭 이름이 실제 컬렉션과 충돌합니다.")
    chunks = prepare_chunks(rows, settings)
    if expected_chunks is not None and len(chunks) != expected_chunks:
        raise ValueError("인덱스 청크 수가 승인 범위와 다릅니다.")
    client.create_collection(
        collection,
        vectors_config=models.VectorParams(
            size=settings.dimensions, distance=models.Distance.COSINE
        ),
    )
    for start in range(0, len(chunks), batch_size):
        batch = chunks[start : start + batch_size]
        vectors = embedder.generate_many(
            [item["embedding_text"] for item in batch], input_type="passage"
        )
        if len(vectors) != len(batch) or any(
            len(vector) != settings.dimensions for vector in vectors
        ):
            raise ValueError("임베딩 결과 개수·차원이 스냅샷과 다릅니다.")
        points = [
            models.PointStruct(id=item["id"], vector=vector, payload=item["payload"])
            for item, vector in zip(batch, vectors)
        ]
        client.upsert(collection, points=points, wait=True)
    actual_count = client.count(
        collection, count_filter=chunk_filter(), exact=True
    ).count
    if actual_count != len(chunks):
        raise ValueError("실제 인덱스 건수와 생성한 청크 수가 다릅니다.")
    counts = dict(Counter(str(row["assembly_number"]) for row in rows))
    manifest = {
        "kind": "manifest",
        "state": "ready",
        "schema_version": SCHEMA_VERSION,
        "embedding_model": settings.embedding_model,
        "dimensions": settings.dimensions,
        "bill_count": len(rows),
        "chunk_count": actual_count,
        "counts_by_assembly": counts,
        "snapshot_sha256": snapshot_hash(rows),
        "indexed_at": datetime.now(timezone.utc).isoformat(),
        "latest_proposal_by_assembly": {
            key: max(
                str(row["propose_date"])
                for row in rows
                if str(row["assembly_number"]) == key
            )
            for key in counts
        },
    }
    client.upsert(
        collection,
        points=[
            models.PointStruct(
                id=MANIFEST_ID, vector=[0.0] * settings.dimensions, payload=manifest
            )
        ],
        wait=True,
    )
    read_manifest(client, collection, settings)
    if activate:
        if not settings.collection.startswith("lawdigest_rag_"):
            raise ValueError("질의응답 전용 별칭만 전환할 수 있습니다.")
        operations = []
        aliases = {alias.alias_name for alias in client.get_aliases().aliases}
        if settings.collection in aliases:
            operations.append(
                models.DeleteAliasOperation(
                    delete_alias=models.DeleteAlias(alias_name=settings.collection)
                )
            )
        operations.append(
            models.CreateAliasOperation(
                create_alias=models.CreateAlias(
                    collection_name=collection, alias_name=settings.collection
                )
            )
        )
        client.update_collection_aliases(change_aliases_operations=operations)
    return manifest
