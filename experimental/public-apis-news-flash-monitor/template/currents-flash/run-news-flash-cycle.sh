#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
source "$ROOT/agent-env.sh"
DATA_DIR="$ROOT/data"
SUMMARY_DIR="$ROOT/summary"
CYCLES="${CYCLES:-2}"
INTERVAL_SECONDS="${INTERVAL_SECONDS:-30}"
NEWS_FLASH_RUN_ID="${NEWS_FLASH_RUN_ID:-$(date -u +%Y%m%dT%H%M%SZ)-$$}"
export NEWS_FLASH_RUN_ID
JSONL_PATH=""

for i in $(seq 1 "$CYCLES"); do
  echo "== news collect cycle $i/$CYCLES =="
  output="$(node "$ROOT/collect-news-once.mjs" "$DATA_DIR")"
  echo "$output"
  JSONL_PATH="$(
    node -e '
      const fs = require("fs");
      const output = JSON.parse(fs.readFileSync(0, "utf8"));
      console.log(output.jsonlPath);
    ' <<< "$output"
  )"
  if [ "$i" != "$CYCLES" ]; then
    sleep "$INTERVAL_SECONDS"
  fi
done

echo "== summarize news flash with agent runner =="
node "$ROOT/summarize-news-flash-with-claude.mjs" \
  "$JSONL_PATH" \
  "$SUMMARY_DIR/news-flash.json"
echo "== final news flash =="
cat "$SUMMARY_DIR/news-flash.json"
