#!/usr/bin/env bash
set -euo pipefail

unit_source=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
units=(
  lawdigest-pipeline@.service
  lawdigest-bill-ingest.timer
  lawdigest-bill-status-sync.timer
  lawdigest-ai-summary.timer
  lawdigest-bill-category-backfill.timer
  lawdigest-bill-search-rebuild.timer
)

if [[ ${1:-} != --install || $# -ne 1 || $EUID -ne 0 ]]; then
  printf 'Usage: sudo %s --install\n' "$0" >&2
  exit 64
fi

for unit in "${units[@]}"; do
  test -r "$unit_source/$unit"
done
test -x "$unit_source/lawdigest-pipeline-wrapper.sh"
install -d -m 0755 /usr/local/libexec
install -d -m 0700 /etc/lawdigest-pipeline /etc/lawdigest-pipeline/approvals
install -m 0755 "$unit_source/lawdigest-pipeline-wrapper.sh" /usr/local/libexec/lawdigest-pipeline-wrapper
for unit in "${units[@]}"; do
  install -m 0644 "$unit_source/$unit" /etc/systemd/system/
done
