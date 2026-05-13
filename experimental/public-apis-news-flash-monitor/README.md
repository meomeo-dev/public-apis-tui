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
- `template/chroniclingamerica-flash/`: no-key newspaper archive template.
- `template/currents-flash/`: keyed Currents news template.
- `template/guardian-flash/`: keyed The Guardian search template.
- `template/marketaux-flash/`: keyed MarketAux financial news template.
- `template/mediastack-flash/`: keyed Mediastack news template.
- `template/newsdata-flash/`: keyed NewsData.io latest-news template.
- `template/nytimes-flash/`: keyed New York Times top stories template.
- `template/thenews-flash/`: keyed TheNewsAPI article-search template.

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
npm run dev -- experimental news-flash run-once \
  --provider spaceflightnews \
  --spaceflightnews-search artemis \
  --spaceflightnews-limit 8
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
- `chroniclingamerica`
- `currents`
- `guardian`
- `marketaux`
- `mediastack`
- `newsdata`
- `nytimes`
- `thenews`

Keyed providers require their provider API key in the caller environment or
local provider config:

- `newsapi`: `NEWSAPI_API_KEY`
- `gnews`: `GNEWS_API_KEY`
- `currents`: `CURRENTS_API_KEY`
- `guardian`: `GUARDIAN_API_KEY`
- `marketaux`: `MARKETAUX_API_KEY`
- `mediastack`: `MEDIASTACK_API_KEY`
- `newsdata`: `NEWSDATAIO_API_KEY`
- `nytimes`: `NYTIMES_API_KEY`
- `thenews`: `THENEWSAPI_API_KEY`

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
- `--chroniclingamerica-query <text>`, count, page, and dates.
- `--currents-keywords <text>`, language, country, category, page-size,
  and page.
- `--guardian-query <text>`, section, tag, date range, order, fields,
  page-size, and page.
- `--marketaux-search <text>`, symbols, countries, industries, language,
  sentiment range, publish range, limit, and page.
- `--mediastack-keywords <text>`, sources, categories, countries, languages,
  date, sort, limit, and offset.
- `--newsdata-query <text>`, search-in, language, country, category, domain,
  sort, dedupe, size, and page.
- `--nytimes-section <section>` and `--nytimes-limit <count>`.
- `--thenews-search <text>`, language, locale, categories, domains,
  publish filters, sort, limit, and page.

The monitor supports two agent CLI runners:

- `claude_code`, the default runner. It reads `ANTHROPIC_BASE_URL`,
  `ANTHROPIC_API_KEY`, and Claude model variables from the runner
  environment. `LITELLM_MASTER_KEY`, `LITELLM_API_KEY`, `LITELLM_BASE_URL`,
  and `LITELLM_API_BASE` are bridged to the matching Anthropic variables when
  the Anthropic variables are not already set.
- `codex`. Pass `--agent-cli-runner codex --codex-profile <profile>` so Codex
  selects the intended profile. The environment bridge reads
  `CODEX_CONFIG_FILE`, `CODEX_HOME/config.toml`, or `~/.codex/config.toml`,
  finds `model_providers.*.env_key`, and exports matching variables from the
  caller shell before running Codex.

Both runners can receive explicit values with repeated `--agent-env
NAME=value` options or with `--agent-env-file <path>`.

The installer must pass both phases before it writes a LaunchAgent:

1. **Preflight checks**: macOS, template files, Node/npm, selected agent CLI,
   selected agent credentials, `terminal-notifier`, `launchctl`, and
   provider-specific API key when required.
2. **Smoke run**: executes the selected template once with `CYCLES=1`,
   `INTERVAL_SECONDS=1`, and provider-specific parameters; if no
   provider-specific limit is supplied, the smoke run uses a small
   provider-specific limit.

Both phases run through the same shell command path as the LaunchAgent. The
installer defaults to `$SHELL`, supports POSIX-style shells (`zsh`, `bash`,
`sh`, `ksh`), sources common startup files, sources `agent-env.sh`, and exports
known monitor variables before running child processes. Use `--shell /bin/zsh`
or
`PUBLIC_APIS_CLI_NEWS_FLASH_SHELL=/bin/zsh` to override. The legacy
`PUBLIC_APIS_TUI_NEWS_FLASH_SHELL` variable is still accepted as a fallback.
`fish` and other non-POSIX shells are rejected because the generated command
intentionally uses POSIX shell syntax.

The smoke run includes the notification step; `--dry-run` can still show a
macOS notification because that is part of the installability check.

Useful safe modes:

```sh
npm run dev -- experimental news-flash install --provider hackernews --dry-run
npm run dev -- experimental news-flash install --provider hackernews --skip-load
npm run dev -- experimental news-flash status
npm run dev -- experimental news-flash uninstall --provider hackernews
```

`--dry-run` performs checks and smoke run but does not write or load the plist.
`--skip-load` writes the plist but does not call `launchctl bootstrap`.
