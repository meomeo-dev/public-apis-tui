# SpaceX REST Provider 开发记录（Development Record）- Implemented

- Provider: SpaceX
- Category: Science & Math
- Backlog line: 1462
- Catalog URL: `https://github.com/r-spacex/SpaceX-API`
- Date: 2026-05-11
- Decision: implemented
- Provider ID: `spacex`
- Operations:
  - `spacex.company`
  - `spacex.rockets`
  - `spacex.launchpads`
  - `spacex.launches`
- Research ID: `research_e5a96c83ddac48e39afda3828290b212`
- Artifact ID: `artifact_b0c5d5b076ca4411895f3c708862beb0`
- Evidence:
  - `evidence_ff1a0395a8174ce18350150ab35fd65f`
  - `evidence_e89ead9e5a8549cfb030c753157dfd7e`
  - `evidence_0559faa46fde4d99b4ec5f8c98c3689f`
  - `evidence_25c1c5a2f992410bbaed504dafef07f3`
  - `evidence_080b4532bfb74b6386eef4f0c98ab3e3`
  - `evidence_b6e70746577f4fbabe9c41a0c6343249`
  - `evidence_2254a24349e84a1fafcd08236f59e6e9`

## 工作流边界（Workflow Boundary）

Tire1.6 Science & Math provider 开发要求可复核的无认证（no-auth）
结构化公共 API。Science & Math provider 必须避免任意代码执行
（arbitrary code execution）、不安全代理、二进制渲染、base64 dump、
公共安全风险和 warning-as-data。

SpaceX REST provider 只暴露官方 r-spacex REST JSON metadata routes。
实现排除 create、update、delete routes、`spacex-key` authenticated
mutations、raw Mongo/Mongoose query 或 options passthrough、GraphQL、
image/media/presskit downloads、HTML scraping 和 browser clickstream。

## 官方来源复核（Official Source Review）

官方 r-spacex repository 是任务表列出的 canonical source。选定端点：

- `GET https://api.spacexdata.com/v4/company`
- `GET https://api.spacexdata.com/v4/rockets`
- `GET https://api.spacexdata.com/v4/launchpads`
- `POST https://api.spacexdata.com/v5/launches/query`

对应 docs 均标注 `Auth required: False`。Launches query docs 支持 JSON
`query` 和 `options` body。CLI 不接受 raw JSON body 或任意 Mongoose
operators，只从 curated flags 构造 bounded body。

## Live Probe 证据

所有探测均在 2026-05-11 从本仓库环境执行，未发送 API key、OAuth
token、cookie、账户凭据或浏览器会话。

- `GET /v4/company` 返回 HTTP 200 `application/json; charset=utf-8`，
  payload 包含 SpaceX company metadata、headquarters、links 和 summary。
- `GET /v4/rockets` 返回 HTTP 200 `application/json; charset=utf-8`，
  payload 是 small rocket metadata array。
- `GET /v4/launchpads` 返回 HTTP 200 `application/json; charset=utf-8`，
  payload 是 launchpad metadata array。
- `POST /v5/launches/query` 返回 HTTP 200
  `application/json; charset=utf-8`，payload 是 paginated launch docs。

## 实现（Implementation）

新增 `SpaceXClient`，使用 `fetch` 调用官方 REST base：
`https://api.spacexdata.com`。

新增 usecase 层：

- `spacex.company`：读取 company metadata。
- `spacex.rockets`：读取 small rocket list，再做 local `search`、`active`、
  `limit` 和 `offset`。
- `spacex.launchpads`：读取 small launchpad list，再做 local `search`、
  `status`、`limit` 和 `offset`。
- `spacex.launches`：支持 curated `name`、`upcoming`、`success`、
  `rocket`、`launchpad`、`start`、`end`、`sort`、`limit` 和 `page`。

JSON projection 包含 provider metadata、auth/no-clickstream boundary、
query policy、pagination、company、rocket、launchpad、launch summaries、
links 和 exclusion notes。

Text renderer 显示 operation identity、endpoint、storage mode、
open REST/no-auth/no Chrome clickstream boundary、transport、query、
pagination、scope、empty state、next commands 和 offline replay command。

## Runtime Audit

实际执行并观察：

- `apis info spacex`
- `apis run spacex.company --help`
- `apis run spacex.rockets --help`
- `apis run spacex.launchpads --help`
- `apis run spacex.launches --help`
- `spacex.company` text and JSON output
- `spacex.rockets` text and JSON output with `--search` and `--active`
- `spacex.launchpads` text and JSON output with `--status`
- `spacex.launches` text and JSON output with launch name and paging filters
- invalid raw query, invalid limit, invalid status, and invalid id probes
- direct endpoint `curl` probes
- online `--persist` and offline replay

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
- `npm run test:contract` with 186 passing tests
- Targeted client, output, registry, catalog, CLI, and JSON-RPC tests
- `PUBLIC_APIS_LIVE_E2E=1 node --import tsx --test test/live-api/spacex.test.ts`
- `git diff --check`
- Targeted secret scan over SpaceX implementation and tests
- deep-research `gate_check`

## 决策（Decision）

Mark `SpaceX` REST as `implemented` with `auditStatus` `audit-todo`. The
provider is ready for the separate audit loop after implementation handoff.
