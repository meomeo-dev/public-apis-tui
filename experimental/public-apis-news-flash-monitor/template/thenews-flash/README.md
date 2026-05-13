# TheNewsAPI All News Flash

Monitors `thenews.all`, writes raw poll windows to JSONL, asks Claude Code
`stream-json` for a strict briefing JSON, renders TXT, and sends a clickable
macOS `terminal-notifier` notification.

## Requirements

- Run from this directory inside a checked-out `public-apis-cli` repo.
- Or set `PUBLIC_APIS_CLI_REPO=/path/to/repo`.
- Claude Code CLI available as `claude` or via `CLAUDE_BIN`.
- Claude credentials inherited from the shell, such as `ANTHROPIC_API_KEY` or
  a mapped LiteLLM variable.
- `terminal-notifier` installed: `brew install terminal-notifier`.
- Requires `THENEWSAPI_API_KEY` in the caller environment or local provider
  config.

## Run

```sh
THENEWS_SEARCH="public api" THENEWS_LANGUAGE=en THENEWS_LIMIT=10 \
  CYCLES=2 INTERVAL_SECONDS=30 ./run-news-flash-cycle-notify.sh
```

The notification opens `summary/news-flash.txt` when clicked. The script does
not open the TXT automatically.

## Overrides

```sh
THENEWS_SEARCH=AI THENEWS_LANGUAGE=en ./run-news-flash-cycle-notify.sh
THENEWS_LOCALE=us THENEWS_CATEGORIES=business,tech \
  ./run-news-flash-cycle-notify.sh
THENEWS_PUBLISHED_ON=2026-05-09 THENEWS_SORT=published_at \
  ./run-news-flash-cycle-notify.sh
PUBLIC_APIS_CLI_REPO=/path/to/public-apis-cli ./run-news-flash-cycle-notify.sh
CLAUDE_BIN=/path/to/claude ./run-news-flash-cycle-notify.sh
```

Supported provider filters are `THENEWS_SEARCH`, `THENEWS_LANGUAGE`,
`THENEWS_LOCALE`, `THENEWS_CATEGORIES`, `THENEWS_DOMAINS`,
`THENEWS_PUBLISHED_AFTER`, `THENEWS_PUBLISHED_BEFORE`,
`THENEWS_PUBLISHED_ON`, `THENEWS_SORT`, `THENEWS_LIMIT`, and
`THENEWS_PAGE`.

## Local Tests

```sh
node --test test/*.test.mjs
```

Tests use fixtures only; they do not call live APIs, Claude, or macOS
notifications.
