# USGS Water Provider 开发记录（Development Record）- Implemented

- Provider: USGS Water Services
- Category: Science & Math
- Backlog line: 1468
- Catalog URL: `https://waterservices.usgs.gov/`
- Date: 2026-05-11
- Decision: implemented
- Provider ID: `usgswater`
- Operations:
  - `usgswater.instantaneous`
  - `usgswater.daily`
- Research ID: `research_d2e89e53718947858356edbd2a7a8281`
- Artifact ID: `artifact_4380a07a1ac64d43b1dee1ffcea8d66a`
- Evidence:
  - `evidence_7001575a4652477e9ade1d51af3e8ef0`
  - `evidence_79094b83fe3f40a88ca32ab050b4d075`
  - `evidence_18e9618feeea401ea250f7c08776011f`
  - `evidence_667dc5ff45424980a892d2de4e559db2`
  - `evidence_c38ba3ed02234e10af08605560d33388`
  - `evidence_533fc149f1a847618d64bafc77b525bb`

## 工作流边界（Workflow Boundary）

Tire1.6 Science & Math provider 开发要求可复核的无认证（no-auth）
结构化公共 API。Science & Math provider 必须避免任意代码执行
（arbitrary code execution）、不安全代理、二进制渲染、base64 dump、
公共安全风险和 warning-as-data。

USGS Water provider 只暴露 read-only NWIS WaterML JSON values。实现排除
browser test tools、Chrome clickstream、Site Service bulk search/export、
state/county/HUC/bbox broad queries、RDB/KML/XML/gzip downloads、raw
WaterML dumps、Water Quality Portal federation、migration endpoints until
separately reviewed、upload/delete/share workflow、binary payload 和
base64 payload。

## 官方来源复核（Official Source Review）

任务表列出的 canonical source 是 USGS WaterServices documentation root：

- `https://waterservices.usgs.gov/`
- `https://waterservices.usgs.gov/docs/instantaneous-values/`
  `instantaneous-values-details/`
- `https://waterservices.usgs.gov/docs/dv-service/`
  `daily-values-service-details/`

Documentation root returned HTTP 200 `text/html; charset=UTF-8` and
identifies machine-readable REST APIs. The same page states WaterServices
will be decommissioned in early 2027 and applications should migrate to
`https://api.waterdata.usgs.gov`.

Instantaneous values docs identify `/nwis/iv/`, JSON output, `parameterCd`,
`siteStatus`, ISO-8601 `period`, and examples using site `01646500` with
parameters `00060,00065`. Daily values docs identify `/nwis/dv/`, JSON
output, `parameterCd`, `statCd`, date arguments, and daily value semantics.
Both docs caution that recent values can be provisional and subject to
revision.

No API key, OAuth, cookie, account setup, browser session, or Chrome
clickstream requirement was observed for selected read-only IV/DV routes.

## Live Probe 证据

所有探测均在 2026-05-11 从本仓库环境执行，未发送 API key、OAuth
token、cookie、账户凭据或浏览器会话。

- Docs root returned HTTP 200 `text/html; charset=UTF-8`.
- IV probe returned HTTP 200 `application/json`.
- DV probe returned HTTP 200 `application/json`.
- IV payload was WaterML JSON `timeSeriesResponseType` for site `01646500`
  and parameters `00060,00065`.
- DV payload was WaterML JSON for site `01646500`, parameter `00060`, and
  date range `2026-05-01..2026-05-11`.
- Site Service JSON probe was not exposed after a direct `/nwis/site/` check
  returned HTTP 400 HTML for the candidate query.

## 实现（Implementation）

新增 `UsgsWaterClient`，使用 `fetch` 调用官方 REST base：
`https://waterservices.usgs.gov/nwis`。

新增 usecase 层：

- `usgswater.instantaneous`：bounded instantaneous values for one site，
  default site `01646500` and parameters `00060,00065`.
- `usgswater.daily`：bounded daily values for one site，default site
  `01646500`、parameter `00060`、statistic `00003`、window
  `2026-05-01..2026-05-11`.

Both operations force `format=json` and `siteStatus=all`. The client parses
WaterML JSON into bounded site、variable、qualifier、reading summaries and
does not project raw `timeSeries` or `queryInfo` payloads.

Local validation:

- site number must be 8-15 digits
- parameter codes are 1-5 five-digit codes
- daily statistic code is five digits
- instantaneous period is `PT1H..PT99H` or `P1D..P7D`
- daily dates must be real `YYYY-MM-DD` dates from 1900 to 2100
- daily window must be non-reversed and at most 31 days
- value limit is `1..50`

Text renderer 显示 operation identity、endpoint、storage mode、open REST、
no-auth/no Chrome clickstream boundary、transport、query、series/value
counts、provisional-data reliability note、scope boundary、readings、
qualifiers、online persist command、offline replay command 和 cross-operation
navigation command。

## Runtime Audit

实际执行并观察：

- `apis info usgswater`
- `apis run usgswater.instantaneous --help`
- `apis run usgswater.daily --help`
- instantaneous text output with site `01646500` and parameters `00060,00065`
- instantaneous JSON output with site `01646500` and limit `2`
- daily text output with site `01646500` and date range `2026-05-01..2026-05-11`
- daily JSON output with site `01646500` and limit `5`
- invalid site `../secret`
- invalid `--limit 51`
- invalid period `P1Y`
- too many parameter codes
- invalid parameter code
- reversed daily date range
- daily date range over 31 days
- direct docs, IV, and DV endpoint probes
- online `--persist`
- offline replay with isolated `PUBLIC_APIS_HOME_DIR`

Observed results were structured JSON or readable JSON-derived text. No HTML,
gateway page, warning-as-data, binary payload, base64 dump, credential flow,
account setup, cookie dependency, browser clickstream, upload, delete, share
workflow, bulk export, or raw WaterML dump was observed for exposed
operations.

## 验证（Validation）

Passed:

- `npm run spec:validate`
- `git diff --check`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run package:verify`
- `npm run test:contract` with 191 passing tests
- `node --import tsx --test test/usgs-water-client.test.ts`
- `node --import tsx --test test/cli-output.test.ts \`
  `--test-name-pattern "USGS Water"`
- `node --import tsx --test test/contract/json-rpc.test.ts \`
  `--test-name-pattern "USGS Water RPC"`
- `node --import tsx --test --test-name-pattern "USGS Water" \`
  `test/cli-program.test.ts`
- `PUBLIC_APIS_LIVE_E2E=1 node --import tsx --test \`
  `test/live-api/usgs-water.test.ts`
- Targeted added-line width scan
- Direct runtime audit commands
- Online `--persist` and offline replay with isolated `PUBLIC_APIS_HOME_DIR`
- deep-research evidence verification and graph snapshot
- deep-research `gate_check` with `ok=true`

## 决策（Decision）

Mark `USGS Water Services` as `implemented` with `auditStatus` `audit-todo`.
The provider is ready for the separate audit loop after implementation
handoff. Migration endpoint `https://api.waterdata.usgs.gov` remains recorded
but not exposed until separately reviewed.
