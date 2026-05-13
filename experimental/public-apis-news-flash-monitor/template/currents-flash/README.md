# Currents Flash

监控 `currents.news`，把轮询窗口写入 JSONL，让代理命令行（agent CLI）
生成严格的快讯 JSON，再渲染 TXT 并发送可点击的 macOS
`terminal-notifier` 通知。

## Requirements

- 从已检出的 `public-apis-cli` 仓库内运行，或设置
  `PUBLIC_APIS_CLI_REPO=/path/to/repo`。
- Claude Code CLI 可通过 `claude` 或 `CLAUDE_BIN` 调用。
- Claude 凭据从 shell 继承，例如 `ANTHROPIC_API_KEY` 或映射后的
  LiteLLM 变量。
- `terminal-notifier` 已安装：`brew install terminal-notifier`。
- 需要 `CURRENTS_API_KEY`，或已写入本地 public-apis provider config。

## Run

```sh
CURRENTS_KEYWORDS=technology CURRENTS_PAGE_SIZE=10 CYCLES=2 \
  INTERVAL_SECONDS=30 ./run-news-flash-cycle-notify.sh
```

通知点击后会打开 `summary/news-flash.txt`。
脚本不会主动打开 TXT 文件。

## Overrides

```sh
CURRENTS_LANGUAGE=en CURRENTS_COUNTRY=us ./run-news-flash-cycle-notify.sh
CURRENTS_CATEGORY=technology CURRENTS_PAGE_SIZE=10 \
  ./run-news-flash-cycle-notify.sh
PUBLIC_APIS_CLI_REPO=/path/to/public-apis-cli \
  ./run-news-flash-cycle-notify.sh
CLAUDE_BIN=/path/to/claude ./run-news-flash-cycle-notify.sh
```

支持的 provider 参数只包括 `keywords`、`language`、`country`、
`category`、`pageSize`、`page`，对应 `CURRENTS_KEYWORDS`、
`CURRENTS_LANGUAGE`、`CURRENTS_COUNTRY`、`CURRENTS_CATEGORY`、
`CURRENTS_PAGE_SIZE`、`CURRENTS_PAGE`。

## Local Tests

```sh
node --test test/*.test.mjs
```

测试只使用 fixtures，不调用 live API、Claude 或 macOS 通知。
