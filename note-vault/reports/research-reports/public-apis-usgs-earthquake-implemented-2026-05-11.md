# USGS Earthquake Provider 开发记录（Development Record）- Implemented

- Provider: USGS Earthquake Hazards Program
- Category: Science & Math
- Backlog line: 1467
- Catalog URL: `https://earthquake.usgs.gov/fdsnws/event/1/`
- Date: 2026-05-11
- Decision: implemented
- Provider ID: `usgsearthquake`
- Operations:
  - `usgsearthquake.search`
  - `usgsearthquake.event`
- Research ID: `research_6c049c64d92e40689a1d5d131ede5364`
- Artifact ID: `artifact_8e2a20fd8fa64099bdfd70a97ee7859a`
- Evidence:
  - `evidence_1521713bd8144128a4699671d2944645`
  - `evidence_913270a75e3f43cfb7f1ebe51e0ffa25`
  - `evidence_95025ba9a5e74a1aa4c1b8efeeaf8010`
  - `evidence_8e4e5ae4f26d4436aa43be4c9a4b093e`
  - `evidence_56a890bec9aa4d2797bfc85fe666a8b5`
  - `evidence_53c4fb79112b41ed89a430486b301abd`

## 工作流边界（Workflow Boundary）

Tire1.6 Science & Math provider 开发要求可复核的无认证（no-auth）
结构化公共 API。Science & Math provider 必须避免任意代码执行
（arbitrary code execution）、不安全代理、二进制渲染、base64 dump、
公共安全风险和 warning-as-data。

USGS Earthquake provider 只暴露 read-only FDSN Event GeoJSON endpoint。
实现排除 HTML event pages、map UI、`application.wadl` proxying、
arbitrary FDSN parameter passthrough、product attachment downloads、
Shakemap binary assets、real-time feed mirroring、unbounded bulk export、
browser clickstream、upload/delete/share workflow、binary payload 和
base64 payload。

## 官方来源复核（Official Source Review）

任务表列出的 canonical source 是 USGS FDSN Event service：

- `https://earthquake.usgs.gov/fdsnws/event/1/`
- `https://earthquake.usgs.gov/fdsnws/event/1/application.json`

Documentation root returned HTTP 200 `text/html; charset=UTF-8`.
`application.json` returned HTTP 200 `application/json` and exposed official
service metadata including catalogs, contributors, producttypes, eventtypes,
and magnitudetypes. No API key, OAuth, cookie, account setup, or browser
session requirement was observed for selected read-only routes.

## Live Probe 证据

所有探测均在 2026-05-11 从本仓库环境执行，未发送 API key、OAuth
token、cookie、账户凭据或浏览器会话。

- Docs root returned HTTP 200 `text/html; charset=UTF-8`.
- `application.json` returned HTTP 200 `application/json`.
- Bounded search query returned HTTP 200 `application/json; charset=utf-8`.
- Search payload was GeoJSON `FeatureCollection` with `metadata` and
  `features`.
- Stable event query for `official20110311054624120_30` returned HTTP 200
  JSON `Feature`.
- Event detail payload includes upstream `properties.products` and nested
  `contents`, so implementation intentionally omits raw product objects and
  product attachment URLs from JSON and text output.
- Live headers included public cache-control with `max-age=60`.

## 实现（Implementation）

新增 `UsgsEarthquakeClient`，使用 `fetch` 调用官方 REST base：
`https://earthquake.usgs.gov/fdsnws/event/1`。

新增 usecase 层：

- `usgsearthquake.search`：bounded earthquake search，默认
  `minMagnitude=4.5`、`limit=10`、`offset=1`、`orderBy=time`。
- `usgsearthquake.event`：按 USGS event id 读取单个 event record，默认
  `official20110311054624120_30`。

Search 强制 `format=geojson` 和 `eventtype=earthquake`，不暴露非地震
event type passthrough。CLI 暴露 curated options：minimum magnitude、
limit、offset、order、start date、end date 和 event id。

Local validation:

- `minMagnitude` 范围 `-1..10`
- `limit` 范围 `1..50`
- `offset` 范围 `1..20000`
- date 范围 `1900..2100`
- event id 使用 safe id regex

JSON projection 包含 provider metadata、auth/no-clickstream boundary、
query、pagination、metadata、event title、magnitude、place、time、
status、alert、felt intensity fields、coordinates、product type names 和
source names。Client 不投影 upstream `properties.products` 或 `contents`。

Text renderer 显示 operation identity、endpoint、storage mode、open
REST/no-auth/no Chrome clickstream boundary、transport、product omission、
query、pagination、reliability note、event summary、next command、online
persist command 和 offline replay command。

## Runtime Audit

实际执行并观察：

- `apis info usgsearthquake`
- `apis run usgsearthquake.search --help`
- `apis run usgsearthquake.event --help`
- search text output with `--min-magnitude 4.5 --limit 2`
- search JSON output with `--min-magnitude 4.5 --limit 2`
- event JSON output with `--event-id official20110311054624120_30`
- date/magnitude search with `2026-05-01..2026-05-11` and magnitude `6`
- invalid `--limit 51`
- invalid `--event-id ../secret`
- invalid `--order-by random`
- invalid reversed start/end dates
- direct docs, `application.json`, query, and event endpoint probes
- online `--persist`
- offline replay with isolated `PUBLIC_APIS_HOME_DIR`

Observed results were structured JSON or readable JSON-derived text. No HTML,
gateway page, warning-as-data, base64 dump, binary payload, credential flow,
account setup, cookie dependency, browser clickstream, upload, delete, share
workflow, product attachment URL dump, or raw upstream product object was
observed for exposed operations.

## 验证（Validation）

Passed:

- `npm run spec:validate`
- `git diff --check`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run package:verify`
- `npm run test:contract` with 190 passing tests
- `node --import tsx --test test/usgs-earthquake-client.test.ts`
- `node --import tsx --test test/cli-output.test.ts \`
  `--test-name-pattern "USGS Earthquake"`
- `node --import tsx --test test/contract/json-rpc.test.ts \`
  `--test-name-pattern "USGS Earthquake RPC"`
- `PUBLIC_APIS_LIVE_E2E=1 node --import tsx --test \`
  `test/live-api/usgs-earthquake.test.ts`
- Targeted added-line width scan
- Direct runtime audit commands
- Online `--persist` and offline replay with isolated `PUBLIC_APIS_HOME_DIR`
- deep-research evidence verification and graph snapshot
- deep-research `gate_check` with `ok=true`

Residual: full `test/cli-program.test.ts` USGS name-pattern run timed out
because the file spawns many help subprocesses. Direct USGS help commands for
both operations succeeded.

## 决策（Decision）

Mark `USGS Earthquake Hazards Program` as `implemented` with `auditStatus`
`audit-todo`. The provider is ready for the separate audit loop after
implementation handoff.
