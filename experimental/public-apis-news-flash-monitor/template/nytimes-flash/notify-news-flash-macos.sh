#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
SUMMARY_JSON="${1:-$ROOT/summary/news-flash.json}"
TXT_PATH="${2:-$ROOT/summary/news-flash.txt}"
provider_slug="$(basename "$ROOT")"
provider_slug="${provider_slug%-flash}"
case "$provider_slug" in
  gnews) provider_name="GNews" ;;
  hackernews) provider_name="Hacker News" ;;
  hashnode) provider_name="Hashnode" ;;
  newsapi) provider_name="NewsAPI" ;;
  nytimes) provider_name="New York Times" ;;
  spaceflightnews) provider_name="Spaceflight News" ;;
  *) provider_name="$provider_slug" ;;
esac
notification_group="public-apis-news-flash-$provider_slug"

if ! command -v terminal-notifier >/dev/null 2>&1; then
  echo "terminal-notifier is required for clickable macOS notifications." >&2
  echo "Install it with: brew install terminal-notifier" >&2
  exit 1
fi

render_output="$(node "$ROOT/render-news-flash-txt.mjs" "$SUMMARY_JSON" "$TXT_PATH")"
headline="$(
  node -e '
const result = JSON.parse(process.argv[1])
console.log(result.headline)
  ' "$render_output"
)"
item_count="$(
  node -e '
const result = JSON.parse(process.argv[1])
console.log(result.itemCount)
  ' "$render_output"
)"
shell_quote() {
  local value=${1//\'/\'\\\'\'}
  printf "'%s'" "$value"
}
open_command="/usr/bin/open $(shell_quote "$TXT_PATH")"

terminal-notifier \
  -title "$provider_name 快讯" \
  -subtitle "Public APIs · $item_count 条新闻" \
  -message "$headline" \
  -execute "$open_command" \
  -group "$notification_group"

echo "$TXT_PATH"
