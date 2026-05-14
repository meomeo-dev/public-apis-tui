# TLE Provider 开发记录（Development Record）- Implemented

- Provider: TLE
- Category: Science & Math
- Backlog line: 1466
- Catalog URL: `https://tle.ivanstanojevic.me/#/docs`
- Date: 2026-05-11
- Decision: implemented
- Provider ID: `tle`
- Operations:
  - `tle.search`
  - `tle.satellite`
- Research ID: `research_7c2d60f710b149ea9980ff17a29ae8be`
- Artifact ID: `artifact_7479100b2f0940bba2d06290ce542ead`
- Evidence:
  - `evidence_21ec767710c747ccb0952f74acba772b`
  - `evidence_f38c2d92054640a7875e593a40dda127`
  - `evidence_7559b86232e34aabb36ccca571a3bbf2`
  - `evidence_b6ea3e88a1d44d06a9442308427a50ee`

## 工作流边界（Workflow Boundary）

Tire1.6 Science & Math provider 开发要求可复核的无认证（no-auth）
结构化公共 API。Science & Math provider 必须避免任意代码执行
（arbitrary code execution）、不安全代理、二进制渲染、base64 dump、
公共安全风险和 warning-as-data。

TLE provider 只暴露 read-only HTTPS JSON endpoint。实现排除 Google
Maps UI、browser clickstream、scraping、arbitrary route proxying、bulk
CelesTrak downloads、binary/base64 payloads、account flows、upload/delete/
share workflow 和 credential paths。

## 官方来源复核（Official Source Review）

任务表列出的 canonical source 是 TLE public documentation SPA：
`https://tle.ivanstanojevic.me/#/docs`。公开站点和 bundle 指向 JSON API
route：

- `GET https://tle.ivanstanojevic.me/api/tle/`
- `GET https://tle.ivanstanojevic.me/api/tle/{satelliteId}`

实现不使用 SPA router、地图 UI、DOM scraping 或 browser clickstream。CLI
只调用 JSON API route，并在输出中显示 no-auth/open REST boundary。

## Live Probe 证据

所有探测均在 2026-05-11 从本仓库环境执行，未发送 API key、OAuth
token、cookie、账户凭据或浏览器会话。

- `GET /api/tle/?search=ISS&page=1` 返回 HTTP 200 `application/json`。
- Search payload 是 Hydra collection，包含 `totalItems`、`member`、
  `parameters` 和 `view`。
- `GET /api/tle/25544` 返回 HTTP 200 `application/json`。
- Satellite payload 包含 `satelliteId`、`name`、`date`、`line1` 和
  `line2`。
- Invalid satellite probe 返回 JSON error，不需要 credential flow 或
  browser challenge。

## 实现（Implementation）

新增 `TleClient`，使用 `fetch` 调用官方 REST base：
`https://tle.ivanstanojevic.me`。

新增 usecase 层：

- `tle.search`：查询 satellite TLE collection，默认 `ISS`，分页默认 `1`。
- `tle.satellite`：按 NORAD satellite id 获取单个 TLE record，默认 `25544`。

Search API 返回固定 page size 20；CLI 将此作为 JSON metadata 展示，
不暴露无效的 page-size passthrough。Search string 限制为 2-80 个安全
字符，拒绝 slash/path-style value。Satellite id 本地限制为
`1..999999`。

JSON projection 包含 provider metadata、auth/no-clickstream boundary、
query、pagination、TLE lines、orbital summary、source URLs 和 excluded
surface notes。

Text renderer 显示 operation identity、endpoint、storage mode、open
REST/no-auth/no Chrome clickstream boundary、transport、query、pagination、
source、satellite summary、next page command、online persist command 和
offline replay command。

## Runtime Audit

实际执行并观察：

- `apis info tle`
- `apis run tle.search --help`
- `apis run tle.satellite --help`
- `tle.search` text and JSON output with `--search ISS --page 1`
- `tle.satellite` text and JSON output with `--satellite-id 25544`
- `tle.search` text output with `--search NOAA --page 1`
- invalid `--search x`
- invalid `--search ../secret`
- invalid `--page 0`
- invalid `--satellite-id 0`
- direct endpoint `curl` probes
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
- `npm run test:contract` with 188 passing tests
- Targeted client, output, registry, catalog, CLI, and JSON-RPC tests
- `PUBLIC_APIS_LIVE_E2E=1 node --import tsx --test test/live-api/tle.test.ts`
- `git diff --check`
- Targeted secret scan over TLE implementation and tests
- Direct runtime audit commands
- Online `--persist` and offline replay with isolated `PUBLIC_APIS_HOME_DIR`
- deep-research `gate_check`

## 决策（Decision）

Mark `TLE` as `implemented` with `auditStatus` `audit-todo`. The provider is
ready for the separate audit loop after implementation handoff.
