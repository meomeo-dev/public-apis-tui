# Hacker News Flash

Monitors `hackernews.stories`, writes raw poll windows to JSONL, asks Claude Code `stream-json` for a strict briefing JSON, renders TXT, and sends a clickable macOS `terminal-notifier` notification.

## Requirements

- Run from this directory inside a checked-out `public-apis-cli` repo.
- Or set `PUBLIC_APIS_CLI_REPO=/path/to/repo`.
- Claude Code CLI available as `claude` or via `CLAUDE_BIN`.
- Claude credentials inherited from the shell, such as `ANTHROPIC_API_KEY` or a mapped LiteLLM variable.
- `terminal-notifier` installed: `brew install terminal-notifier`.
- No API key required.

## Run

```sh
HACKERNEWS_LIST=top HACKERNEWS_LIMIT=10 CYCLES=2 INTERVAL_SECONDS=30 ./run-news-flash-cycle-notify.sh
```

The notification opens `summary/news-flash.txt` when clicked. The script does not open the TXT automatically.

## Overrides

```sh
HACKERNEWS_LIST=best HACKERNEWS_LIMIT=10 ./run-news-flash-cycle-notify.sh
HACKERNEWS_LIST=new HACKERNEWS_LIMIT=10 ./run-news-flash-cycle-notify.sh
PUBLIC_APIS_CLI_REPO=/path/to/public-apis-cli ./run-news-flash-cycle-notify.sh
CLAUDE_BIN=/path/to/claude ./run-news-flash-cycle-notify.sh
```

## Local Tests

```sh
node --test test/*.test.mjs
```

Tests use fixtures only; they do not call live APIs, Claude, or macOS notifications.
