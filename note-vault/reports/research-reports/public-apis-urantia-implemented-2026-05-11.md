# Urantia Papers Provider 开发记录（Development Record）- Implemented

- Provider: Urantia Papers
- Category: Books
- Backlog line: 271
- Catalog URL: `https://urantia.dev`
- Date: 2026-05-11
- Decision: implemented
- Provider ID: `urantia`
- Operations:
  - `urantia.toc`
  - `urantia.paper`
  - `urantia.paragraph`
  - `urantia.search`
- Research ID: `research_6407d54be6d6407db24086a5e4d7b5ae`
- Artifact ID: `artifact_78cc566e37e5467099add46a93b009eb`
- Evidence:
  - `evidence_a3bb36b7393e4383a6c447dfb1e39ccd`
  - `evidence_402087f447d34fbfb48cf24a47693498`
  - `evidence_1a2fcb53c6ac400aa876c21e1b659757`
  - `evidence_7286b2f219e3489cbaed47ea06a4e472`
  - `evidence_c1a2762555a542c0aa5441b016767bc8`
  - `evidence_7d19c7f49bf44e91a57e41cb5a0b0105`

## 工作流边界（Workflow Boundary）

Tire1.6 Books provider 开发要求可复核的无认证（no-auth）结构化公共
API。Urantia Papers provider 只暴露 read-only HTTPS JSON endpoint。

实现排除 account/auth routes、`/me`、MCP、AI tool schema endpoints、
audio downloads、video/media URL surfacing、Open Graph image generation、
embedding vector export、semantic search、browser scraping、upload、delete、
share workflow 和 arbitrary route proxying。

## 官方来源复核（Official Source Review）

任务表列出的 canonical source 是 `https://urantia.dev`。`llms.txt` 记录
public API base URL、OpenAPI URL、no-auth boundary 和 rate limit note。
OpenAPI JSON 位于：

- `https://api.urantia.dev/openapi.json`

实现只调用 Urantia public API 的 JSON route，不使用网站 DOM、browser
clickstream、MCP server 或 AI tool endpoint。

## Live Probe 证据

所有探测均在 2026-05-11 从本仓库环境执行，未发送 API key、OAuth
token、cookie、账户凭据或浏览器会话。

- `GET https://api.urantia.dev/` 返回 HTTP 200 JSON。
- API root body 标识 `Urantia Papers API`，version `1.0.0`。
- API root headers 包含 `access-control-allow-origin: *`。
- API root headers 观察到 `x-ratelimit-limit: 200`。
- `llms.txt` 记录 no-auth 和 100 requests/minute/IP。
- `GET /openapi.json` 返回 HTTP 200 `application/json`。
- `GET /toc` 返回 JSON `data.parts`。
- `GET /papers/0` 返回 paper 和 paragraphs JSON。
- `GET /paragraphs/0:0.1` 返回 paragraph 和 navigation JSON。
- `GET /search?q=thought%20adjuster&limit=3&type=and` 返回 search JSON。
- Invalid paper/search probes returned structured upstream errors.

## 实现（Implementation）

新增 `UrantiaClient`，使用 `fetch` 调用官方 REST base：
`https://api.urantia.dev`。

新增 usecase 层：

- `urantia.toc`：读取 table of contents，并本地分页 part list。
- `urantia.paper`：按 paper id 读取单篇 paper，默认 `0`。
- `urantia.paragraph`：按 documented paragraph reference 读取单段。
- `urantia.search`：执行 full-text search，默认 `thought adjuster`。

CLI 暴露 curated options：paper id、reference、query、search type、language、
limit、page、offset、paper filter 和 part filter。Paper id 限制为
`0..196`，part id 限制为 `0..4`，search limit cap 为 `50`。

JSON projection 包含 provider metadata、auth/no-clickstream boundary、
query、pagination、text、references、labels 和 navigation。Client 不投影
upstream `htmlText`、`audio`、`video`、media URL 或 embedding vector。

Text renderer 显示 operation identity、endpoint、storage mode、open
REST/no-auth/no Chrome clickstream boundary、transport、query、pagination、
empty state、paragraph summary、next command、online persist command 和
offline replay command。

## Runtime Audit

实际执行并观察：

- `apis info urantia`
- `apis run urantia.toc --help`
- `apis run urantia.paper --help`
- `apis run urantia.paragraph --help`
- `apis run urantia.search --help`
- text and JSON output for all four operations
- search with JSON summary
- invalid `--paper-id 197`
- invalid `--ref ../secret`
- invalid `--limit 101`
- direct endpoint probes
- online `--persist`
- offline replay

Observed results were structured JSON or readable JSON-derived text. No HTML,
gateway page, warning-as-data, base64 dump, binary payload, credential flow,
account setup, cookie dependency, browser clickstream, upload, delete, or share
workflow was observed for exposed operations.

## 验证（Validation）

Passed:

- `npm run typecheck`
- `npm run lint`
- `npm run spec:validate`
- `npm run build`
- `npm run package:verify`
- `npm run test:contract` with 189 passing tests
- `node --import tsx --test test/urantia-client.test.ts`
- `node --import tsx --test test/cli-output.test.ts --test-name-pattern Urantia`
- `node --import tsx --test test/contract/json-rpc.test.ts --test-name-pattern Urantia`
- `PUBLIC_APIS_LIVE_E2E=1 node --import tsx --test test/live-api/urantia.test.ts`
- `git diff --check`
- Targeted secret scan over Urantia implementation and tests
- Direct runtime audit commands
- Online `--persist` and offline replay with isolated `PUBLIC_APIS_HOME_DIR`
- deep-research `gate_check`

Residual: full `test/cli-program.test.ts` Urantia name-pattern run timed out
because the file spawns many help subprocesses, while direct Urantia help
commands for all four operations succeeded.

## 决策（Decision）

Mark `Urantia Papers` as `implemented` with `auditStatus` `audit-todo`. The
provider is ready for the separate audit loop after implementation handoff.
