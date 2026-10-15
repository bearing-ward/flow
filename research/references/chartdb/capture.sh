#!/usr/bin/env bash
set -euo pipefail
harness_dir="$(cd "$(dirname "$0")" && pwd)"
flow_root="$(cd "$harness_dir/../../.." && pwd)"
chartdb_dir=/tmp/chartdb-ref/src
chartdb_commit=c24936a402bb3e24b4858f05282d69a04fcfe25b
mkdir -p /tmp/chartdb-ref "$harness_dir/results/screenshots"
if [ ! -d "$chartdb_dir/.git" ]; then
  git clone --depth 1 https://github.com/chartdb/chartdb "$chartdb_dir"
  git -C "$chartdb_dir" fetch --depth 1 origin "$chartdb_commit"
  git -C "$chartdb_dir" checkout --detach "$chartdb_commit"
fi
if [ "$(git -C "$chartdb_dir" rev-parse HEAD)" != "$chartdb_commit" ]; then
  echo "ChartDB checkout must be pinned to $chartdb_commit" >&2
  exit 1
fi
if [ -n "$(git -C "$chartdb_dir" status --porcelain)" ]; then
  echo 'ChartDB checkout has modifications; refusing to capture them.' >&2
  exit 1
fi
(cd "$chartdb_dir" && npm ci --no-audit --no-fund)
cd "$flow_root"
bun install --frozen-lockfile
bunx playwright install chromium
if lsof -nP -iTCP:4190 -sTCP:LISTEN >/dev/null 2>&1; then
  echo 'Port 4190 is already occupied. Stop its owner before running capture.sh.' >&2
  exit 1
fi
(cd "$chartdb_dir" && exec node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4190 --strictPort) >/tmp/chartdb-ref/vite.log 2>&1 &
chartdb_pid=$!
trap 'kill "$chartdb_pid" 2>/dev/null || true' EXIT
for attempt in {1..60}; do
  if curl --silent --fail http://127.0.0.1:4190/ >/dev/null; then break; fi
  sleep 1
done
curl --silent --fail http://127.0.0.1:4190/ >/dev/null
bunx playwright test -c research/references/chartdb/playwright.config.mjs
node research/references/chartdb/source-evidence.mjs

node research/references/chartdb/enrich-results.mjs
node research/references/chartdb/validate-results.mjs
node research/references/chartdb/write-reference.mjs
bunx oxfmt research/references/chartdb/results research/references/chartdb/REFERENCE.md
