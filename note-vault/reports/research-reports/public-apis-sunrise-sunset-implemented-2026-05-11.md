# Sunrise and Sunset Provider 开发记录（Development Record）- Implemented

- Provider: Sunrise and Sunset
- Category: Science & Math
- Backlog line: 1464
- Catalog URL: `https://sunrise-sunset.org/api`
- Date: 2026-05-11
- Decision: implemented
- Provider ID: `sunrisesunset`
- Operation: `sunrisesunset.times`
- Research ID: `research_30fa6aa06efb42ba9088154f4668f583`
- Artifact ID: `artifact_203436183f6d4761b9750db0e401b363`
- Evidence:
  - `evidence_80545afa29974597b288490276eb06f4`
  - `evidence_dd1d6e2fa0724722aaca9778221aa09f`
  - `evidence_e3fd41da8ae94e0e9030bcc640f1f033`

## 工作流边界（Workflow Boundary）

Tire1.6 Science & Math provider 开发要求可复核的无认证（no-auth）
结构化公共 API。Science & Math provider 必须避免任意代码执行
（arbitrary code execution）、不安全代理、二进制渲染、base64 dump、
公共安全风险和 warning-as-data。

Sunrise and Sunset provider 只暴露官方 Sunrise-Sunset.org HTTPS JSON
endpoint。实现排除 JSONP `callback`、相对日期 passthrough、HTML pages、
browser search、scraping、arbitrary path proxying、account flows、binary
payloads 和 base64 payloads。

## 官方来源复核（Official Source Review）

任务表列出的 canonical source 是 Sunrise-Sunset.org API page。官方页面
文档化：

- `GET https://api.sunrise-sunset.org/json`
- `lat` 和 `lng` 坐标参数
- `date` 参数，支持 `YYYY-MM-DD` 以及相对日期
- `formatted` 参数，其中 `0` 返回 ISO 8601 timestamps
- `tzid` 参数，用于选择返回 timestamp timezone
- `callback` 参数，用于 JSONP

官方页面说明不需要 signup 或 API key，同时要求 attribution，并
警告不要发送过量或滥用请求。CLI 因此只暴露 bounded read-only JSON
operation，
并显示 attribution required metadata。

## Live Probe 证据

所有探测均在 2026-05-11 从本仓库环境执行，未发送 API key、OAuth
token、cookie、账户凭据或浏览器会话。

- `GET /json?lat=36.72016&lng=-4.42034&date=2026-05-11&formatted=0&tzid=UTC`
  返回 HTTP 200 `application/json`。
- Payload 包含 `results.sunrise`、`results.sunset`、`solar_noon`、
  twilight fields、`day_length` seconds、`status: OK` 和 `tzid: UTC`。
- 无效 latitude 的 direct probe 返回 HTTP 200 与 1970 timestamps，
  因此实现必须本地拒绝越界坐标。
- 无效 `tzid` 的 direct probe 返回 HTTP 200 且 fallback 到 `UTC`，
  因此实现必须本地拒绝无效 timezone identifier。

## 实现（Implementation）

新增 `SunriseSunsetClient`，使用 `fetch` 调用官方 REST base：
`https://api.sunrise-sunset.org`。

新增 usecase 层：

- `sunrisesunset.times`：读取 sunrise、sunset、solar noon、day length
  和 civil、nautical、astronomical twilight times。

Operation 暴露 curated 参数：

- `--latitude <number>`，默认 `36.72016`。
- `--longitude <number>`，默认 `-4.42034`。
- `--date <YYYY-MM-DD>`，默认 `2026-05-11`。
- `--tzid <timezone>`，默认 `UTC`。

固定 default date 避免 upstream `today` 随时间变化影响 cache key 和
offline replay。Client 强制 `formatted=0`，不发送 `callback`。本地校验
latitude、longitude、Gregorian date 和 IANA timezone identifier。

JSON projection 包含 provider metadata、auth/no-clickstream boundary、
query、status、timezone、solar time fields、attribution requirement 和
excluded surface notes。

Text renderer 显示 operation identity、endpoint、storage mode、open
REST/no-auth/no Chrome clickstream boundary、transport、query、timezone、
status、attribution requirement、solar event times、day length、next
online command 和 offline replay command。

## Runtime Audit

实际执行并观察：

- `apis info sunrisesunset`
- `apis run sunrisesunset.times --help`
- `sunrisesunset.times` text output
- `sunrisesunset.times` JSON output
- fixed lat/lng/date/tzid parameter combination
- invalid `--date tomorrow`
- invalid `--latitude 91`
- invalid `--tzid Invalid/Zone`
- direct endpoint `curl` probes
- online `--persist`
- offline replay

Observed results were structured JSON or readable JSON-derived text. No HTML,
gateway page, warning-as-data, base64 dump, binary payload, API key, OAuth,
account setup, cookie dependency, browser clickstream, upload, delete, or share
workflow was observed for the exposed operation.

## 验证（Validation）

Passed:

- `npm run typecheck`
- `npm run lint`
- `npm run spec:validate`
- `npm run build`
- `npm run package:verify`
- `npm run test:contract` with 187 passing tests
- Targeted client, output, registry, catalog, CLI, and JSON-RPC tests
- `PUBLIC_APIS_LIVE_E2E=1 node --import tsx --test test/live-api/sunrise-sunset.test.ts`
- Direct runtime audit commands
- Online `--persist` and offline replay with isolated `PUBLIC_APIS_HOME_DIR`
- Targeted secret scan over Sunrise-Sunset implementation and tests
- deep-research `gate_check`

## 决策（Decision）

Mark `Sunrise and Sunset` as `implemented` with `auditStatus` `audit-todo`.
The provider is ready for the separate audit loop after implementation handoff.
