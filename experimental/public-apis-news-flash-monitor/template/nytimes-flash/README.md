# NYTimes Top Stories Flash

Monitors `nytimes.topStories`, writes raw poll windows to JSONL, asks
Claude Code `stream-json` for a strict briefing JSON, renders TXT, and sends
a clickable macOS `terminal-notifier` notification.

## Requirements

- Run from this directory inside a checked-out `public-apis-cli` repo.
- Or set `PUBLIC_APIS_CLI_REPO=/path/to/repo`.
- Claude Code CLI available as `claude` or via `CLAUDE_BIN`.
- Claude credentials inherited from the shell, such as `ANTHROPIC_API_KEY` or
  a mapped LiteLLM variable.
- `terminal-notifier` installed: `brew install terminal-notifier`.
- Requires `NYTIMES_API_KEY` in the caller environment or local provider
  config.

## Run

```sh
NYTIMES_SECTION=home NYTIMES_LIMIT=10 CYCLES=2 \
  INTERVAL_SECONDS=30 ./run-news-flash-cycle-notify.sh
```

The notification opens `summary/news-flash.txt` when clicked. The script does
not open the TXT automatically.

## Overrides

```sh
NYTIMES_SECTION=technology NYTIMES_LIMIT=10 ./run-news-flash-cycle-notify.sh
NYTIMES_SECTION=world NYTIMES_LIMIT=10 ./run-news-flash-cycle-notify.sh
PUBLIC_APIS_CLI_REPO=/path/to/public-apis-cli ./run-news-flash-cycle-notify.sh
CLAUDE_BIN=/path/to/claude ./run-news-flash-cycle-notify.sh
```

## Local Tests

```sh
node --test test/*.test.mjs
```

Tests use fixtures only; they do not call live APIs, Claude, or macOS
notifications.
