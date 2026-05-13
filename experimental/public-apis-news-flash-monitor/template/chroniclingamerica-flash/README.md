# Chronicling America Flash

监控 `chroniclingamerica.search`，把轮询窗口写入 JSONL，让代理命令行
（agent CLI）生成严格的快讯 JSON，再渲染 TXT 并发送可点击的 macOS
`terminal-notifier` 通知。

## Requirements

- 从已检出的 `public-apis-cli` 仓库内运行，或设置
  `PUBLIC_APIS_CLI_REPO=/path/to/repo`。
- Claude Code CLI 可通过 `claude` 或 `CLAUDE_BIN` 调用。
- Claude 凭据从 shell 继承，例如 `ANTHROPIC_API_KEY` 或映射后的
  LiteLLM 变量。
- `terminal-notifier` 已安装：`brew install terminal-notifier`。
- Chronicling America 不需要 API key。

## Run

```sh
CHRONICLINGAMERICA_QUERY=news CYCLES=2 INTERVAL_SECONDS=30 \
  ./run-news-flash-cycle-notify.sh
```

通知点击后会打开 `summary/news-flash.txt`。
脚本不会主动打开 TXT 文件。

## Overrides

```sh
CHRONICLINGAMERICA_QUERY=lincoln CHRONICLINGAMERICA_COUNT=5 \
  ./run-news-flash-cycle-notify.sh
CHRONICLINGAMERICA_DATES=1860/1865 ./run-news-flash-cycle-notify.sh
PUBLIC_APIS_CLI_REPO=/path/to/public-apis-cli \
  ./run-news-flash-cycle-notify.sh
CLAUDE_BIN=/path/to/claude ./run-news-flash-cycle-notify.sh
```

支持的 provider 参数只包括 `query`、`count`、`page`、`dates`，对应
`CHRONICLINGAMERICA_QUERY`、`CHRONICLINGAMERICA_COUNT`、
`CHRONICLINGAMERICA_PAGE`、`CHRONICLINGAMERICA_DATES`。

## Local Tests

```sh
node --test test/*.test.mjs
```

测试只使用 fixtures，不调用 live API、Claude 或 macOS 通知。
