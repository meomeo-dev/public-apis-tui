# SHARE Provider 开发记录（Development Record）- Implemented

- Provider: SHARE
- Category: Science & Math
- Backlog line: 1461
- Catalog URL: `https://share.osf.io/api/v2/`
- Date: 2026-05-11
- Decision: implemented
- Provider ID: `share`
- Operations:
  - `share.search`
  - `share.sources`
- Research ID: `research_480402faa6d840e28ca19352c152ec43`
- Artifact ID: `artifact_a293535ea29743a4a1a10d14180b912f`
- Evidence:
  - `evidence_5651fb02b21d44caa6c344ab3478834c`
  - `evidence_c973d566728241ef9fcc5b1155739b6c`
  - `evidence_95ce54a26250482f88de0da163f33568`
  - `evidence_aabcc979a3c841328a13d7f74084086f`
  - `evidence_f406a4b93ea943baa4eb84746175b159`
  - `evidence_608c88757e0949c086a72d68aeddc437`

## 工作流边界（Workflow Boundary）

Tire1.6 Science & Math provider 开发要求可复核的无认证（no-auth）
结构化公共 API。Science & Math provider 必须避免任意代码执行
（arbitrary code execution）、不安全代理、二进制渲染、base64 dump、
公共安全风险和 warning-as-data。

SHARE 的底层搜索端点是 Elasticsearch-backed。实现只暴露 curated
metadata workflow，不暴露 raw Elasticsearch DSL、aggregations、
SHARE Discover browser-generated query body、account routes、source push
或 curation mutation、RSS/Atom bulk dump、arbitrary route proxying、
HTML scraping、browser clickstream、binary downloads 或 credentials。

## 官方来源复核（Official Source Review）

官方 SHARE 文档说明 SHARE 提供 Elasticsearch API endpoint：
`https://share.osf.io/api/v2/search/creativeworks/_search`。该 endpoint
用于搜索 SHARE normalized data，并列出 `title`、`description`、
`type`、`date`、`date_created`、`date_modified`、`date_updated`、
`date_published`、`tags`、`subjects`、`sources`、`language`、
`contributors`、`funders` 和 `publishers` 等 indexed fields。

文档示例展示 `POST` JSON body 方式发送 `query_string` search，也展示
aggregations 和 Discover page 生成 query DSL 的能力。为了保持 CLI
安全边界，本实现只构造 bounded `simple_query_string` body，不接收用户
提供的 raw JSON 或 raw DSL。

## Live Probe 证据

所有探测均在 2026-05-11 从本仓库环境执行，未发送 API key、OAuth
token、cookie、账户凭据或浏览器会话。

- `GET https://share.osf.io/api/v2/` 返回 HTTP 200
  `application/vnd.api+json`，并列出 `sources`、`users`、`status`、
  `rss` 和 `atom` links。
- `POST /api/v2/search/creativeworks/_search` 返回 HTTP 200
  `application/json`，包含 Elasticsearch `hits`、`timed_out` 和
  structured `_source` metadata。
- `GET /api/v2/sources/` 返回 HTTP 200 `application/vnd.api+json`，
  包含 source resources、attributes、relationships 和 links。
- `GET /api/v2/status` 返回 HTTP 200 JSON status payload。
- RSS feed 可访问但返回 large XML feed；本实现不暴露 bulk feed dump。

## 实现（Implementation）

新增 `ShareClient`，使用 `fetch` 调用：

- `POST https://share.osf.io/api/v2/search/creativeworks/_search`
- `GET https://share.osf.io/api/v2/sources/`

新增 usecase 层：

- `share.search`：默认 query `reproducibility`，支持 curated `--query`、
  `--type`、`--source`、`--sort relevance|date`、`--limit`、`--offset`
  和 `--description-length`。
- `share.sources`：读取 public source directory page，支持 local
  `--query`、`--limit` 和 `--offset`。

JSON projection 包含 provider metadata、auth/no-clickstream boundary、
query、pagination、search timing、works/sources summaries、links、
contributors、sources、tags、subjects 和 identifiers。

Text renderer 显示 operation identity、endpoint、storage mode、
open REST/no-auth/no Chrome clickstream boundary、transport、query、
pagination、scope、empty state、next commands 和 offline replay command。

## Runtime Audit

实际执行并观察：

- `apis info share`
- `apis run share.search --help`
- `apis run share.sources --help`
- `share.search` text output:

```text
apis run share.search --format text -- --query reproducibility \
  --type preprint --source OSF --limit 2
```

- `share.search` JSON output:

```text
apis run share.search --format json -- --query reproducibility \
  --type preprint --source OSF --limit 2
```
- `apis run share.sources --format text -- --limit 3`
- `apis run share.sources --format json -- --limit 3`
- `share.search` invalid raw JSON/DSL query rejection
- direct endpoint `curl` probes
- online `--persist` and offline replay for both operations

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
- `npm run test:contract` with 185 passing tests
- Targeted unit/output/registry/endpoint tests with 221 passing tests
- SHARE-specific CLI help test via `--test-name-pattern 'SHARE'`
- `PUBLIC_APIS_LIVE_E2E=1 node --import tsx --test test/live-api/share.test.ts`
  with 2 passing tests
- `git diff --check`

Residual:

- Full `test/cli-program.test.ts` timed out after 600 seconds when run alone.
  The SHARE-specific help test in that file passed with `--test-name-pattern`.

## 决策（Decision）

Mark `SHARE` as `implemented` with `auditStatus` `audit-todo`. The provider is
ready for the separate audit loop after implementation handoff.
