# Mediastack News Flash

监控（monitor）`mediastack.news`，把轮询窗口写入 JSONL，调用 agent
runner 生成严格的快讯 JSON，渲染 TXT，并发送可点击的 macOS
`terminal-notifier` 通知。

## Requirements

- 从本目录运行，且本目录位于已检出的 `public-apis-cli` 仓库内。
- 或设置 `PUBLIC_APIS_CLI_REPO=/path/to/repo`。
- Claude Code CLI 可通过 `claude` 或 `CLAUDE_BIN` 调用。
- Claude 凭据（credentials）从 shell 继承。
- `terminal-notifier` 已安装：`brew install terminal-notifier`。
- 调用环境或本地 provider config 中存在 `MEDIASTACK_API_KEY`。

## Run

```sh
MEDIASTACK_COUNTRIES=us MEDIASTACK_LANGUAGES=en MEDIASTACK_LIMIT=10 \
  CYCLES=2 INTERVAL_SECONDS=30 ./run-news-flash-cycle-notify.sh
```

通知被点击后会打开 `summary/news-flash.txt`。脚本不会自动打开 TXT。

## Overrides

```sh
MEDIASTACK_KEYWORDS=AI MEDIASTACK_LIMIT=10 ./run-news-flash-cycle-notify.sh
MEDIASTACK_CATEGORIES=technology ./run-news-flash-cycle-notify.sh
PUBLIC_APIS_CLI_REPO=/path/to/public-apis-cli ./run-news-flash-cycle-notify.sh
CLAUDE_BIN=/path/to/claude ./run-news-flash-cycle-notify.sh
```

支持的 provider 环境变量与 `mediastack.news` operation 保持一致：
`MEDIASTACK_KEYWORDS`、`MEDIASTACK_SOURCES`、`MEDIASTACK_CATEGORIES`、
`MEDIASTACK_COUNTRIES`、`MEDIASTACK_LANGUAGES`、`MEDIASTACK_DATE`、
`MEDIASTACK_SORT`、`MEDIASTACK_LIMIT`、`MEDIASTACK_OFFSET`。

## Local Tests

```sh
node --test test/*.test.mjs
```

测试只使用 fixtures；不会调用 live APIs、Claude 或 macOS 通知。
