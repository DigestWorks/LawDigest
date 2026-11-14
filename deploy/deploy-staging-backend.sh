#!/bin/bash
# 운영 API와 별개인 테스트 백엔드(staging)를 띄운다.
# 운영 컨테이너(lawdigest-backend-test, :808)와 nginx는 건드리지 않는다.
# 사용법: ./deploy/deploy-staging-backend.sh <target-worktree>

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_ROOT="${1:?대상 워크트리 경로를 지정하세요}"

PROD_CONTAINER_NAME="lawdigest-backend-test"
PROD_PORT="808"

export PORT="${STAGING_BACKEND_PORT:-8090}"
export CONTAINER_NAME="${STAGING_BACKEND_CONTAINER:-lawdigest-backend-staging}"
export IMAGE_NAME="${STAGING_BACKEND_IMAGE:-lawdigest-backend-staging}"
# 본체 기본값(PORT+10000 = 18090)은 서버의 다른 서비스가 쓰고 있다.
export STAGING_PORT="${STAGING_BACKEND_PRECHECK_PORT:-28090}"
export ACTIVE="${STAGING_BACKEND_ACTIVE:-prod}"
export BACKEND_DEPLOY_LABEL="테스트(staging)"

COMMON_GIT_DIR="$(git -C "$TARGET_ROOT" rev-parse --git-common-dir)"
SHARED_REPO_ROOT="$(cd "$COMMON_GIT_DIR/.." && pwd)"
export LOG_DIR="$SHARED_REPO_ROOT/.runtime/staging-backend/logs"

if [ "$CONTAINER_NAME" = "$PROD_CONTAINER_NAME" ] || [ "$IMAGE_NAME" = "$PROD_CONTAINER_NAME" ] || [ "$PORT" = "$PROD_PORT" ]; then
  echo "✗ staging 설정이 운영 컨테이너·이미지·포트와 겹칩니다: $CONTAINER_NAME / $IMAGE_NAME / :$PORT"
  exit 1
fi

# 본체 스크립트는 .env.preview로 PORT·CONTAINER_NAME을 덮어쓸 수 있다.
# 그 경우 운영 컨테이너를 교체할 수 있으므로 staging 배포를 거부한다.
for preview_env in "$TARGET_ROOT/.env.preview" "$TARGET_ROOT/services/backend/.env.preview"; do
  if [ -f "$preview_env" ]; then
    echo "✗ $preview_env 가 있으면 staging 배포를 진행하지 않습니다."
    exit 1
  fi
done

mkdir -p "$LOG_DIR"
exec "$SCRIPT_DIR/deploy-test-backend.sh" "$TARGET_ROOT"
