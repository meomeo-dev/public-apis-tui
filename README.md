# Public APIs CLI

[中文 README](./README.zh-CN.md)

Terminal CLI for running documented public API integrations. It provides
provider discovery, typed operation help, readable text output, JSON output,
local API-key config, SQLite persistence, offline replay, and experimental
scheduled news-flash monitors.

![Public APIs CLI provider overview](./docs/assets/apis-list-hero.png)

## Install

```sh
npm install -g public-apis-cli
public-apis version
public-apis apis list
```

Use without global install:

```sh
npx public-apis-cli version
npx public-apis-cli apis list
```

## Core Commands

- Show version: `public-apis version`
- List providers and operations: `public-apis apis list`
- Describe one provider: `public-apis apis info ukpolice`
- Show operation options: `public-apis apis run ukpolice.streetCrimes --help`
- Run an operation:

```sh
public-apis apis run ukpolice.streetCrimes -- \
  --latitude 51.5074 \
  --longitude -0.1278 \
  --limit 5
```

- Output JSON:

```sh
public-apis apis run hackernews.stories --format json -- --limit 5
```

- Configure a provider: `public-apis apis config newsapi`
- List cached results: `public-apis apis cache list ukpolice`
- Run JSON-RPC: see the JSON-RPC section below.

Arguments before `--` belong to the generic runner. Arguments after `--`
belong to the provider operation.

## Provider Examples

### UK Police, No Auth

```sh
public-apis apis info ukpolice
public-apis apis run ukpolice.streetCrimes -- \
  --latitude 51.5074 \
  --longitude -0.1278 \
  --category all-crime \
  --limit 10
```

![UK Police street crimes](./docs/assets/ukpolice-street-crimes.png)

### Hacker News, No Auth

```sh
public-apis apis run hackernews.stories -- --list top --limit 10
public-apis apis run hackernews.thread -- --id 8863 --limit 20
```

### Spaceflight News, No Auth

```sh
public-apis apis run spaceflightnews.articles -- --search artemis --limit 10
public-apis apis run spaceflightnews.articles --format json -- \
  --news-site NASA \
  --limit 5
```

### NewsAPI, API Key

```sh
public-apis apis config newsapi --set-secret NEWSAPI_API_KEY=your_key
public-apis apis run newsapi.headlines -- \
  --country us \
  --category technology \
  --page-size 10
```

The config output redacts secret values. The raw file lives under
`~/.cdp-cli/public-apis-cli/public-apis/<provider>/config.json` by default.

### GNews, API Key

```sh
public-apis apis config gnews --set-secret GNEWS_API_KEY=your_key
public-apis apis run gnews.headlines -- \
  --category technology \
  --country us \
  --max 10
```

## API Key Config

Use provider config for keys instead of putting secrets in shell history.

```sh
public-apis apis config newsapi --set-secret NEWSAPI_API_KEY=your_key
public-apis apis config gnews --set-secret GNEWS_API_KEY=your_key
public-apis apis config mediastack --set-secret MEDIASTACK_API_KEY=your_key
```

Read or remove secrets:

```sh
public-apis apis config newsapi
public-apis apis config newsapi --unset-secret NEWSAPI_API_KEY
```

Provider clients resolve keys in this order when supported:

1. explicit CLI option such as `--api-key`;
2. environment variable such as `NEWSAPI_API_KEY`;
3. local provider config written by `apis config`.

## Persistence And Offline Replay

Persist one live result:

```sh
public-apis apis run ukpolice.streetCrimes --online --persist -- \
  --latitude 51.5074 \
  --longitude -0.1278 \
  --limit 5
```

Replay without calling the upstream API:

```sh
public-apis apis run ukpolice.streetCrimes --offline -- \
  --latitude 51.5074 \
  --longitude -0.1278 \
  --limit 5
```

Make persistence the provider default:

```sh
public-apis apis config ukpolice --persist --default-mode online
public-apis apis cache list ukpolice
public-apis apis cache clear ukpolice
```

Offline replay is useful for tests, demos, and debugging unstable upstream APIs.

## Experimental News Flash

The npm package includes the experimental news-flash monitor templates under
`experimental/public-apis-news-flash-monitor/`. They can poll selected
providers, ask Claude CLI to summarize the cycle, render a TXT briefing, and
install a macOS LaunchAgent schedule.

```sh
public-apis experimental news-flash providers
public-apis experimental news-flash run-once --provider hackernews
public-apis experimental news-flash install --provider spaceflightnews \
  --interval-minutes 30
```

Use `PUBLIC_APIS_CLI_REPO=/path/to/public-apis-cli` when a template needs an
explicit repository or package root. The legacy `PUBLIC_APIS_TUI_REPO` variable
is still accepted as a compatibility fallback.

![News flash run-once output](./docs/assets/news-flash-run-once.png)
![News flash TXT briefing](./docs/assets/news-flash-briefing-txt.png)

## JSON-RPC

Start a line-delimited JSON-RPC server over stdin/stdout:

```sh
printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"hackernews.stories","params":{"limit":3}}' \
  | public-apis rpc
```

Use JSON-RPC when another agent or process needs a stable command surface
without parsing terminal text.

## Boundary Rules

- Uses documented REST or documented JSON endpoints.
- Stores API keys in local provider config, not command history.
- Keeps readable output as a projection of structured JSON results.
- Supports offline replay from local SQLite cache.

## Troubleshooting

### `Unknown operation`

Run:

```sh
public-apis apis list
public-apis apis info <provider>
```

Then use the exact operation id, for example `ukpolice.streetCrimes`.

### Provider option is ignored

Put provider options after `--`:

```sh
public-apis apis run hackernews.stories -- --list top --limit 10
```

Wrong shape:

```sh
public-apis apis run hackernews.stories --list top --limit 10
```

### API key is configured but a provider says it is missing

Check the provider config:

```sh
public-apis apis config newsapi
```

### Offline mode returns nothing

Persist one online result first:

```sh
public-apis apis run ukpolice.streetCrimes --online --persist -- \
  --latitude 51.5074 \
  --longitude -0.1278 \
  --limit 5
public-apis apis run ukpolice.streetCrimes --offline -- \
  --latitude 51.5074 \
  --longitude -0.1278 \
  --limit 5
```

## License

MIT. See [LICENSE](./LICENSE).
