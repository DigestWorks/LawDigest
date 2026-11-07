"""서버 CPU에서 실행하는, revision과 파일 해시가 고정된 다국어 E5 임베딩."""

import hashlib
from pathlib import Path

E5_REPO = "intfloat/multilingual-e5-small"
E5_REVISION = "614241f622f53c4eeff9890bdc4f31cfecc418b3"
E5_MODEL_ID = f"{E5_REPO}:onnx-qint8@{E5_REVISION}"
E5_DIMENSIONS = 384
E5_CONTEXT = 512
E5_FILES = {
    "tokenizer.json": (
        "tokenizer.json",
        17082730,
        "0b44a9d7b51c3c62626640cda0e2c2f70fdacdc25bbbd68038369d14ebdf4c39",
    ),
    "model_qint8_avx512_vnni.onnx": (
        "onnx/model_qint8_avx512_vnni.onnx",
        118346824,
        "dd476dd0c2514e9b9be83aeb3853fac0763e0bdf4a71645407587d77c48a2d88",
    ),
}


def verify_model_file(path, filename):
    _, expected_size, expected_digest = E5_FILES[filename]
    if not path.is_file() or path.stat().st_size != expected_size:
        raise ValueError("로컬 임베딩 파일이 없거나 크기가 다릅니다.")
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    if digest.hexdigest() != expected_digest:
        raise ValueError("로컬 임베딩 파일 해시가 다릅니다.")
    return path


def model_directory(directory):
    if not directory or not Path(directory).is_absolute():
        raise ValueError("로컬 임베딩 디렉터리의 절대 경로가 필요합니다.")
    return Path(directory)


def load_local_tokenizer(directory):
    from tokenizers import Tokenizer

    filename = "tokenizer.json"
    path = verify_model_file(model_directory(directory) / filename, filename)
    tokenizer = Tokenizer.from_file(str(path))
    tokenizer.no_truncation()
    tokenizer.no_padding()
    return tokenizer


class LocalE5Embedder:
    def __init__(self, directory, threads=2):
        import onnxruntime as ort

        self.tokenizer = load_local_tokenizer(directory)
        self.tokenizer.enable_truncation(max_length=E5_CONTEXT)
        self.tokenizer.enable_padding(
            pad_id=self.tokenizer.token_to_id("<pad>"), pad_token="<pad>"
        )
        filename = "model_qint8_avx512_vnni.onnx"
        path = verify_model_file(model_directory(directory) / filename, filename)
        options = ort.SessionOptions()
        options.intra_op_num_threads = threads
        options.inter_op_num_threads = 1
        self.session = ort.InferenceSession(
            str(path), sess_options=options, providers=["CPUExecutionProvider"]
        )

    def generate_many(self, texts, *, input_type="passage"):
        import numpy as np

        if (
            input_type not in {"passage", "query"}
            or not texts
            or any(not isinstance(text, str) or not text.strip() for text in texts)
        ):
            raise ValueError("임베딩할 질문 또는 원문을 확인해 주세요.")
        vectors = []
        for start in range(0, len(texts), 4):
            batch = self.tokenizer.encode_batch(
                [f"{input_type}: {text}" for text in texts[start : start + 4]]
            )
            if input_type == "passage" and any(item.overflowing for item in batch):
                raise ValueError("검색 원문 청크가 임베딩 문맥 길이를 넘었습니다.")
            arrays = {
                "input_ids": np.asarray([item.ids for item in batch], dtype=np.int64),
                "attention_mask": np.asarray(
                    [item.attention_mask for item in batch], dtype=np.int64
                ),
                "token_type_ids": np.asarray(
                    [item.type_ids for item in batch], dtype=np.int64
                ),
            }
            state = self.session.run(["last_hidden_state"], arrays)[0]
            mask = arrays["attention_mask"].astype(np.float32)[..., None]
            pooled = (state * mask).sum(axis=1) / mask.sum(axis=1)
            norms = np.linalg.norm(pooled, axis=1, keepdims=True)
            if (
                pooled.shape != (len(batch), E5_DIMENSIONS)
                or not np.isfinite(pooled).all()
                or (norms == 0).any()
            ):
                raise RuntimeError(
                    "로컬 임베딩 벡터의 차원 또는 값이 올바르지 않습니다."
                )
            vectors.extend((pooled / norms).tolist())
        return vectors
