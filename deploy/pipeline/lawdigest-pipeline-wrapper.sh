#!/usr/bin/env bash
set -euo pipefail
umask 077

job=${1:-}
case "$job" in
  bill-ingest|bill-status-sync|ai-summary|bill-category-backfill) ;;
  *) printf 'Unknown pipeline job: %s\n' "$job" >&2; exit 64 ;;
esac

: "${LAWDIGEST_PIPELINE_ROOT:?Set the pipeline checkout in runtime.env}"
: "${LAWDIGEST_PIPELINE_PYTHON:?Set the pipeline Python executable in runtime.env}"
: "${STATE_DIRECTORY:?Missing systemd StateDirectory}"
: "${LOGS_DIRECTORY:?Missing systemd LogsDirectory}"

export TZ=Asia/Seoul
export LAWDIGEST_PIPELINE_LOG_DIR="$LOGS_DIRECTORY"
export PYTHONPATH="$LAWDIGEST_PIPELINE_ROOT/services/data/src:$LAWDIGEST_PIPELINE_ROOT/services/ai/src"
cd "$LAWDIGEST_PIPELINE_ROOT"
test -x "$LAWDIGEST_PIPELINE_PYTHON"
test -d services/data/src/lawdigest_data/runtime
test -d services/ai/src/lawdigest_ai
if [[ "$job" == ai-summary ]] && ! command -v codex >/dev/null; then
  printf 'Codex CLI is required for ai-summary.\n' >&2
  exit 69
fi

exec 9>"$STATE_DIRECTORY/pipeline.lock"
flock -w 900 9

approval="${CREDENTIALS_DIRECTORY:-/nonexistent}/approval"
run_date=$(date +%F)
revision=$(git rev-parse HEAD)
if [[ ! -r "$approval" ]] ||
   ! read -r approved_job approved_date approval_id approved_revision extra < "$approval" ||
   [[ "$approved_job" != "$job" || "$approved_date" != "$run_date" || "$approved_revision" != "$revision" || -n "$extra" ]] ||
   [[ ! "$approval_id" =~ ^[A-Za-z0-9_-]{8,80}$ ]]; then
  printf 'Valid one-time approval required for %s on %s.\n' "$job" "$run_date" >&2
  exit 78
fi

if ! git diff --quiet HEAD -- services/data services/ai; then
  printf 'Pipeline source differs from the approved revision.\n' >&2
  exit 78
fi

# Keep consumption on persistent storage, including failed runs and reboots.
mkdir -p "$STATE_DIRECTORY/consumed"
if ! mkdir "$STATE_DIRECTORY/consumed/$job-$run_date-$approval_id"; then
  printf 'Approval already used or state directory unavailable for %s.\n' "$job" >&2
  exit 78
fi

runtime=("$LAWDIGEST_PIPELINE_PYTHON" -m lawdigest_data.runtime.cli --log-dir "$LOGS_DIRECTORY")
case "$job" in
  bill-ingest|bill-status-sync)
    start_date=$(date -d "$run_date 2 days ago" +%F)
    exec "${runtime[@]}" "$job" --mode prod --age 22 --start-date "$start_date" --end-date "$run_date"
    ;;
  ai-summary)
    exec "${runtime[@]}" ai-summary --mode prod --read-mode prod --target pending --report-mode summary \
      --concurrency 1 --batch-session-size 5 --limit 40 --output-dir "$STATE_DIRECTORY/reports"
    ;;
  bill-category-backfill)
    cd services/ai
    exec "$LAWDIGEST_PIPELINE_PYTHON" -m scripts.backfill_bill_category --mode prod --age 22 --execute
    ;;
esac
