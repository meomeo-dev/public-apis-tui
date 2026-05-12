# Public APIs News Flash Monitor

Experimental extension capability for turning periodic API polling into
AI-authored briefings.

This directory is outside the production runtime. It contains:

- `SKILL.md`: method for designing API monitoring briefings.
- `template/spaceflightnews-flash/`: no-key space/aerospace news template.
- `template/hackernews-flash/`: no-key Hacker News story-list template.
- `template/hashnode-flash/`: no-key public Hashnode publication template.
- `template/newsapi-flash/`: keyed NewsAPI headlines template.
- `template/gnews-flash/`: keyed GNews headlines template.

Each template is self-contained and has fixture-only tests under `test/`.

Run local template tests:

```sh
for dir in template/*-flash; do (cd "$dir" && node --test test/*.test.mjs); done
```

Runtime outputs go to each template's ignored `data/` and `summary/` directories.

## Install As A Scheduled Monitor

Use the experimental CLI from the repository root:

```sh
npm run dev -- experimental news-flash providers
npm run dev -- experimental news-flash doctor --provider spaceflightnews
npm run dev -- experimental news-flash run-once --provider spaceflightnews --spaceflightnews-search artemis --spaceflightnews-limit 8
```

When the provider is ready, install the schedule:

```sh
npm run dev -- experimental news-flash install \
  --provider spaceflightnews \
  --interval-minutes 30 \
  --spaceflightnews-search artemis \
  --spaceflightnews-limit 8
```

Supported providers:

- `spaceflightnews`
- `hackernews`
- `hashnode`
- `newsapi`
- `gnews`

Provider parameters can be passed to `doctor`, `run-once`, and `install`.
`install` stores them in the LaunchAgent command, so future scheduled runs use
the same provider query.

Common parameters:

- `--spaceflightnews-limit <count>` where count is 1-500,
  `--spaceflightnews-search <text>`, and `--spaceflightnews-site <site>`.
- `--hackernews-list <top|new|best|ask|show|job>` and
  `--hackernews-limit <count>` where count is 1-30.
- `--hashnode-host <host>`, `--hashnode-first <count>` where count is 1-20,
  and `--hashnode-after <cursor>`.
- `--newsapi-country <code>`, category, query, page-size, sources, and page.
- `--gnews-query <text>`, category, language, country, max, from, to, and page.

The installer must pass both phases before it writes a LaunchAgent:

1. **Preflight checks**: macOS, template files, Node/npm, Claude CLI, Claude
   credentials, `terminal-notifier`, `launchctl`, and provider-specific API key
   when required.
2. **Smoke run**: executes the selected template once with `CYCLES=1`,
   `INTERVAL_SECONDS=1`, and provider-specific parameters; if no
   provider-specific limit is supplied, the smoke run uses a small
   provider-specific limit.

Both phases run through the same shell command path as the LaunchAgent. The
installer defaults to `$SHELL`, supports POSIX-style shells (`zsh`, `bash`,
`sh`, `ksh`), sources common startup files, and exports known monitor variables
before running child processes. Use `--shell /bin/zsh` or
`PUBLIC_APIS_CLI_NEWS_FLASH_SHELL=/bin/zsh` to override. The legacy
`PUBLIC_APIS_TUI_NEWS_FLASH_SHELL` variable is still accepted as a fallback.
`fish` and other non-POSIX shells are rejected because the generated command
intentionally uses POSIX shell syntax.

The smoke run includes the notification step; `--dry-run` can still show a macOS notification because that is part of the installability check.

Useful safe modes:

```sh
npm run dev -- experimental news-flash install --provider hackernews --dry-run
npm run dev -- experimental news-flash install --provider hackernews --skip-load
npm run dev -- experimental news-flash status
npm run dev -- experimental news-flash uninstall --provider hackernews
```

`--dry-run` performs checks and smoke run but does not write or load the plist.
`--skip-load` writes the plist but does not call `launchctl bootstrap`.
