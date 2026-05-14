# USGS Water Provider 审计记录（Audit Record）- Audited

- Provider: USGS Water Services
- Category: Science & Math
- Catalog URL: `https://waterservices.usgs.gov/`
- Date: 2026-05-12 UTC
- Decision: audited
- Provider ID: `usgswater`
- Operations: `usgswater.instantaneous`, `usgswater.daily`
- Research ID: `research_edff4f98602b45cea60ba95b41220dd1`
- Artifact: `artifact_86d869fe5389471d8d665ea46a2444dd`

## 结论（Decision）

USGS Water provider 通过 command-driven runtime/TUI audit。实现继续暴露
no-auth HTTPS WaterML JSON REST endpoints:

- `GET https://waterservices.usgs.gov/nwis/iv/`
- `GET https://waterservices.usgs.gov/nwis/dv/`

CLI 只使用 curated single-site site number、parameter codes、optional
instantaneous period、daily statistic code、bounded daily date window 与 value
limit controls。输出保持 bounded site、variable、qualifier、reading summary
projection，包含 storage mode、pagination、reliability 与 open-API boundary
metadata。

Browser test tools、Site Service bulk export、state/county/HUC/bbox broad
queries、RDB/KML/XML/gzip downloads、Water Quality Portal federation、
migration endpoints at `api.waterdata.usgs.gov`、upload/delete/share
workflows、binary payloads、base64 payloads 与 raw upstream WaterML dumps
remain excluded.

## Runtime Audit

实际执行并观察：

- `npx tsx src/cli.ts apis info usgswater`
- `npx tsx src/cli.ts apis run usgswater.instantaneous --help`
- `npx tsx src/cli.ts apis run usgswater.daily --help`
- `npx tsx src/cli.ts apis run usgswater.instantaneous --format text`
  `-- --site 01646500 --parameter-codes 00060,00065 --period P1D`
  `--limit 3`
- `npx tsx src/cli.ts apis run usgswater.daily --format json`
  `-- --site 01646500 --parameter-codes 00060 --statistic-code 00003`
  `--start-date 2026-05-01 --end-date 2026-05-11 --limit 5`
- `npx tsx src/cli.ts apis run usgswater.instantaneous --format json`
  `-- --site 01646500 --parameter-codes 00060 --period PT6H --limit 2`
- empty-state daily probe with site `99999999`
- invalid probes for site `../secret`, six parameter codes, period `P1Y`,
  reversed date range, and limit `51`
- online `--persist` followed by offline replay with isolated
  `PUBLIC_APIS_HOME_DIR` for both operations

Representative outputs showed provider identity, endpoint, storage mode,
HTTPS WaterML JSON REST transport, no-auth/open REST boundary, no Chrome
clickstream boundary, single-site scope, pagination, reliability note, source
metadata, again/replay commands, and current/daily pivot commands. Text output
did not dump HTML, raw WaterML `timeSeries`, queryInfo, RDB, XML, KML, gzip,
binary data, base64 data, or broad Site Service payloads.

Invalid site, parameter count, period, date-window, and limit probes exited
nonzero with `INVALID_ARGUMENT` before unsafe requests were built.

## Direct Endpoint Probes

Direct probes covered:

- service root; returned HTTP 200 `text/html` documentation.
- IV docs route; returned HTTP 200 `text/html`.
- DV docs route; returned HTTP 200 `text/html`.
- bounded IV JSON route; returned HTTP 200 `application/json`.
- bounded DV JSON route; returned HTTP 200 `application/json`.
- IV RDB route; returned HTTP 200 `text/plain;charset=UTF-8` outside CLI
  projection.
- DV WaterML XML route; returned HTTP 200 `text/xml;charset=UTF-8` outside
  CLI projection.
- Site Service state query; returned HTTP 200 `text/plain;charset=UTF-8`
  outside CLI projection.
- migration root at `api.waterdata.usgs.gov`; returned HTTP 200 `text/html`
  outside this provider boundary.
- missing NWIS route; returned HTTP 404 `text/html` and was not treated as
  operation data.
- raw IV JSON shape; contained `queryInfo` and `timeSeries`, while CLI/RPC
  projection exposed only bounded summaries.

Runtime routes used `server: Apache`. No `cf-mitigated: challenge`,
Cloudflare challenge title, CAPTCHA page, JavaScript redirect shell,
parked-domain page, gateway interstitial, credential flow, browser clickstream,
binary runtime payload, or base64 runtime payload was observed.

## 修复（Fix）

Updated `src/infrastructure/openApis/usgsWaterClient.ts` so response bodies are
read as text, checked for representative challenge signals, then parsed as
JSON:

- HTTP 403/429 `text/html`
- `cf-mitigated: challenge`
- Cloudflare server header
- `Just a moment...` challenge title
- CAPTCHA, access-denied, and attention-required HTML markers

Detected challenges throw:

- code: `OPEN_API_FAILED`
- message: USGS Water Services are returning a challenge HTML page
- details: provider id, HTTP status, status text, content type, and URL

Updated `test/usgs-water-client.test.ts` with regression coverage for
challenge HTML.

## 验证（Validation）

Passed:

- `node --import tsx --test test/usgs-water-client.test.ts`
- `node --import tsx --test test/cli-output.test.ts --test-name-pattern`
  `"USGS Water|usgswater"`
- `node --import tsx --test test/public-api-registry.test.ts`
  `--test-name-pattern "USGS Water|usgswater"`
- `node --import tsx --test test/endpoint-catalog.test.ts`
  `--test-name-pattern "USGS Water|usgswater"`
- `node --import tsx --test test/contract/json-rpc.test.ts`
  `--test-name-pattern "USGS Water|usgswater"`
- direct CLI info/help, runtime text/JSON, invalid-argument, empty-state,
  boundary, endpoint, bulk-format, and content-boundary probes
- online `--persist` and offline replay with isolated `PUBLIC_APIS_HOME_DIR`
- `PUBLIC_APIS_LIVE_E2E=1 node --import tsx --test`
  `test/live-api/usgs-water.test.ts`
- `npm run lint`
- `npm run typecheck`
- `npm run spec:validate`
- `npm run build:tarball`
- `npm run package:verify`
- `npm run quality:check` with lint, typecheck, spec validation, full test,
  and contract stages passing
- full test stage within `quality:check` with 1307 passing unit tests
- contract stage within `quality:check` with 194 passing contract tests
- `git diff --check`
- added-line width scan for touched files
- targeted secret scan over the current diff

## 残余不确定（Residual Uncertainty）

Recent USGS water values can be provisional and subject to revision.
WaterServices documentation notes migration away from legacy WaterServices in
early 2027; this audit keeps the already implemented endpoints visible and
does not switch to unreviewed migration routes. The provider now fails clearly
if future WAF/challenge HTML appears, and cached/offline replay remains
available for previously persisted requests.

## 参考（References）

- `evidence_92c47a1ee9a245b8a06c2156357aff48`
- `evidence_9a6c8d1c535b4d5099207b7625c5f008`
- `evidence_cb0eea659745413490efcc7107bf4771`
- `evidence_7c5f430b70aa4529a84ca894a0547ce2`
