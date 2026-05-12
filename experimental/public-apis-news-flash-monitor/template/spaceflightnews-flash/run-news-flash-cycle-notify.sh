#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
source "$ROOT/claude-env.sh"
"$ROOT/run-news-flash-cycle.sh"
"$ROOT/notify-news-flash-macos.sh" "$ROOT/summary/news-flash.json" "$ROOT/summary/news-flash.txt"
