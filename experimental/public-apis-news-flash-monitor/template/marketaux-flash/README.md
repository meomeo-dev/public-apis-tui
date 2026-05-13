# MarketAux Flash

Monitors `marketaux.news`, writes poll windows to JSONL, asks Claude Code
`stream-json` for a strict briefing JSON, renders TXT, and sends a clickable
macOS `terminal-notifier` notification.

## Requirements

- Run from this directory inside a checked-out `public-apis-cli` repo.
- Or set `PUBLIC_APIS_CLI_REPO=/path/to/repo`.
- Claude Code CLI available as `claude` or via `CLAUDE_BIN`.
- Claude credentials inherited from the shell.
- `terminal-notifier` installed: `brew install terminal-notifier`.
- Requires `MARKETAUX_API_KEY` in the caller environment or local provider
  config.

## Run

```sh
MARKETAUX_SEARCH=semiconductors MARKETAUX_LIMIT=10 ./run-news-flash-cycle-notify.sh
```

The notification opens `summary/news-flash.txt` when clicked. The script does
not open the TXT automatically.

## Overrides

```sh
MARKETAUX_SYMBOLS=TSLA,MSFT MARKETAUX_COUNTRIES=us ./run-news-flash-cycle.sh
MARKETAUX_LANGUAGE=en MARKETAUX_INDUSTRIES=Technology ./run-news-flash-cycle.sh
MARKETAUX_SENTIMENT_MIN=0 MARKETAUX_SENTIMENT_MAX=1 ./run-news-flash-cycle.sh
MARKETAUX_PUBLISHED_AFTER=2026-05-01 ./run-news-flash-cycle.sh
PUBLIC_APIS_CLI_REPO=/path/to/public-apis-cli ./run-news-flash-cycle-notify.sh
CLAUDE_BIN=/path/to/claude ./run-news-flash-cycle-notify.sh
```

## Local Tests

```sh
node --test test/*.test.mjs
```

Tests use fixtures only; they do not call live APIs, Claude, or macOS notifications.
