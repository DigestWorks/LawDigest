#!/usr/bin/env bash
# main에 포함된 AI HTTP 코드를 전용 venv와 release로 배포한다. DB/인덱스에는 쓰지 않는다.
set -euo pipefail

TARGET_ROOT="$(cd "${1:?usage: deploy-rag.sh <target-worktree>}" && pwd)"
SOURCE_DIR="$TARGET_ROOT/services/ai"
TASK_COMMON_DIR="$(git -C "$TARGET_ROOT" rev-parse --path-format=absolute --git-common-dir)"
SHARED_ROOT="$(dirname "$TASK_COMMON_DIR")"
RUNTIME_ROOT="$SHARED_ROOT/.runtime/rag"
PRIVATE_ENV="${RAG_ENV_FILE:?RAG_ENV_FILE must point to a private absolute env file}"
RAG_PYTHON_EXE="${RAG_PYTHON_BIN:-python3}"
case "$PRIVATE_ENV" in /*) ;; *) echo '환경 파일은 절대 경로여야 합니다.' >&2; exit 1;; esac
test -r "$PRIVATE_ENV"
test -f "$SOURCE_DIR/src/lawdigest_ai/rag/api.py"
command -v pm2 >/dev/null
command -v flock >/dev/null
"$RAG_PYTHON_EXE" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 12) else "RAG에는 Python 3.12 이상이 필요합니다.")'
mkdir -p "$RUNTIME_ROOT/releases"
exec 9>"$RUNTIME_ROOT/deploy.lock"
flock -n 9 || { echo '다른 RAG 배포가 진행 중입니다.' >&2; exit 1; }
git -C "$TARGET_ROOT" diff --quiet
git -C "$TARGET_ROOT" diff --cached --quiet
TASK_SHA="$(git -C "$TARGET_ROOT" rev-parse HEAD)"
git -C "$TARGET_ROOT" fetch origin main --quiet
git -C "$TARGET_ROOT" merge-base --is-ancestor "$TASK_SHA" origin/main || {
  echo 'main에 포함된 커밋만 배포할 수 있습니다.' >&2; exit 1;
}
# 비밀값은 출력하거나 PM2 설정에 복사하지 않는다.
"$RAG_PYTHON_EXE" - "$PRIVATE_ENV" <<'PY'
import os, stat, sys
info = os.stat(sys.argv[1])
if info.st_uid != os.getuid() or stat.S_IMODE(info.st_mode) & 0o077:
    raise SystemExit('환경 파일은 실행 사용자 소유이고 권한이 600 또는 400이어야 합니다.')
PY

RELEASE="$RUNTIME_ROOT/releases/$(date -u +%Y%m%dT%H%M%SZ)-${TASK_SHA:0:12}"
mkdir "$RELEASE"
git -C "$TARGET_ROOT" archive "$TASK_SHA" services/ai | tar -x -C "$RELEASE"
"$RAG_PYTHON_EXE" -m venv "$RELEASE/.venv"
"$RELEASE/.venv/bin/python" -m pip install --disable-pip-version-check -q -r "$RELEASE/services/ai/requirements-rag.txt"
"$RELEASE/.venv/bin/python" -m pip freeze > "$RELEASE/requirements-resolved.txt"
printf '%s\n' "$TASK_SHA" > "$RELEASE/commit-sha"
PREVIOUS="$(readlink -f "$RUNTIME_ROOT/current" 2>/dev/null || true)"
start_release() {
  local release_path="$1"
  pm2 delete lawdigest-rag >/dev/null 2>&1 || true
  RAG_ENV_FILE="$PRIVATE_ENV" PYTHONPATH="$release_path/services/ai/src" \
    pm2 start "$release_path/.venv/bin/python" --name lawdigest-rag --cwd "$release_path" --interpreter none \
      -- -m uvicorn lawdigest_ai.rag.api:app --host 127.0.0.1 --port 8110 --workers 1 --no-access-log
}
if ! start_release "$RELEASE"; then
  test -z "$PREVIOUS" || start_release "$PREVIOUS"
  exit 1
fi
READY=0
for attempt in $(seq 1 20); do
  if RAG_ENV_FILE="$PRIVATE_ENV" PYTHONPATH="$RELEASE/services/ai/src" "$RELEASE/.venv/bin/python" - <<'PY' 2>/dev/null
import json, sys, urllib.request
from lawdigest_ai.rag.settings import RagSettings
settings = RagSettings.from_env()
request = urllib.request.Request('http://127.0.0.1:8110/v1/status?assembly=22',
    headers={'Authorization': 'Bearer ' + settings.internal_token})
try:
    with urllib.request.urlopen(request, timeout=12) as response:
        ready = json.load(response).get('available') is True
    sys.exit(0 if ready else 1)
except Exception:
    sys.exit(1)
PY
  then
    READY=1; break
  fi
  sleep 1
done
if [ "$READY" != 1 ]; then
  pm2 delete lawdigest-rag >/dev/null 2>&1 || true
  test -z "$PREVIOUS" || start_release "$PREVIOUS"
  echo 'RAG 시작 확인 실패. 이전 release 복구를 시도했습니다.' >&2
  exit 1
fi
ln -s "$RELEASE" "$RUNTIME_ROOT/.current-new"
mv -Tf "$RUNTIME_ROOT/.current-new" "$RUNTIME_ROOT/current"
pm2 save >/dev/null
echo "RAG release: $TASK_SHA (127.0.0.1:8110)"
echo '인덱스 상태와 질문 검증을 마친 뒤 deploy-prod-web.sh로 웹을 반영하세요.'
