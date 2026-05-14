# USGS Earthquake Provider 审计记录（Audit Record）- Audited

- Provider: USGS Earthquake Hazards Program
- Category: Science & Math
- Catalog URL: `https://earthquake.usgs.gov/fdsnws/event/1/`
- Date: 2026-05-12 UTC
- Decision: audited
- Provider ID: `usgsearthquake`
- Operations: `usgsearthquake.search`, `usgsearthquake.event`
- Research ID: `research_0d9ee9515ffb4dcd8c0138be5fcd819d`
- Artifact: `artifact_8d279029fe4d4230a2a9c81e6daabfbd`

## 结论（Decision）

USGS Earthquake provider 通过 command-driven runtime/TUI audit。实现继续暴露
no-auth HTTPS GeoJSON REST endpoint:

- `GET https://earthquake.usgs.gov/fdsnws/event/1/query`

CLI 只使用 curated minimum magnitude、limit、offset、order、start/end date
与 event id controls。Search 强制 `format=geojson` 与
`eventtype=earthquake`，event detail 强制 `format=geojson` 和 safe event
id。输出保持 bounded metadata projection，包含 source URL、pagination、
coordinates、product type names、source names、storage mode 与 open-API
boundary metadata。

HTML event pages、map UI、WADL proxying、arbitrary FDSN parameter passthrough、
non-earthquake event-type passthrough、product attachment downloads、Shakemap
binary assets、real-time feed mirroring、bulk catalog export、browser scraping、
browser clickstream、upload/delete/share workflows、binary payloads、base64
payloads 与 raw upstream `products` / `contents` dumps remain excluded.

## Runtime Audit

实际执行并观察：

- `npx tsx src/cli.ts apis info usgsearthquake`
- `npx tsx src/cli.ts apis run usgsearthquake.search --help`
- `npx tsx src/cli.ts apis run usgsearthquake.event --help`
- `npx tsx src/cli.ts apis run usgsearthquake.search --format text`
  `-- --min-magnitude 4.5 --limit 2 --offset 1 --order-by time`
- `npx tsx src/cli.ts apis run usgsearthquake.event --format json`
  `-- --event-id official20110311054624120_30`
- `npx tsx src/cli.ts apis run usgsearthquake.search --format json`
  `-- --min-magnitude 5 --limit 3 --offset 1 --order-by magnitude`
  `--start-time 2026-01-01 --end-time 2026-05-12`
- empty-state probe with `--min-magnitude 10 --limit 2`
- maximum-offset boundary probe with `--offset 20000`
- invalid probes for limit `51`, order `random`, event id `../secret`, and
  reversed date range
- online `--persist` followed by offline replay with isolated
  `PUBLIC_APIS_HOME_DIR` for both operations

Representative outputs showed provider identity, endpoint, storage mode,
HTTPS GeoJSON REST transport, no-auth/open REST boundary, no Chrome
clickstream boundary, query summary, pagination, reliability note, source
metadata, next/again/replay commands, and open-first command. Text output did
not dump HTML, WADL XML, product attachment objects, product download URLs,
binary data, base64 data, or raw upstream product payloads.

Invalid limit, order, event id, and date-range probes exited nonzero with
`INVALID_ARGUMENT` before unsafe requests were built.

## Direct Endpoint Probes

Direct probes covered:

- FDSN docs route; returned HTTP 200 `text/html` documentation.
- `GET /application.json`; returned HTTP 200 `application/json`.
- bounded search query; returned HTTP 200 `application/json;charset=utf-8`.
- stable event query; returned HTTP 200 `application/json;charset=utf-8`.
- `GET /application.wadl`; returned HTTP 200 `application/xml` outside CLI
  projection.
- HTML event page; returned HTTP 200 `text/html` outside runtime data.
- missing route; returned documentation HTML and was not treated as operation
  data.
- raw event `properties.products` contents; contained attachment names and
  binary-capable asset types, but CLI/RPC projection exposed only product type
  names and source names.

Runtime routes used `server: nginx`. No `cf-mitigated: challenge`,
Cloudflare challenge title, CAPTCHA page, JavaScript redirect shell,
parked-domain page, gateway interstitial, credential flow, browser clickstream,
binary runtime payload, or base64 runtime payload was observed.

## 修复（Fix）

Updated `src/infrastructure/openApis/usgsEarthquakeClient.ts` so response
bodies are read as text, checked for representative challenge signals, then
parsed as JSON:

- HTTP 403/429 `text/html`
- `cf-mitigated: challenge`
- Cloudflare server header
- `Just a moment...` challenge title
- CAPTCHA, access-denied, and attention-required HTML markers

Detected challenges throw:

- code: `OPEN_API_FAILED`
- message: USGS Earthquake API is returning a challenge HTML page
- details: provider id, HTTP status, status text, content type, and URL

Updated `test/usgs-earthquake-client.test.ts` with regression coverage for
challenge HTML.

## 验证（Validation）

Passed:

- `node --import tsx --test test/usgs-earthquake-client.test.ts`
- `node --import tsx --test test/cli-output.test.ts --test-name-pattern`
  `"USGS Earthquake|usgsearthquake"`
- `node --import tsx --test test/public-api-registry.test.ts`
  `--test-name-pattern "USGS Earthquake|usgsearthquake"`
- `node --import tsx --test test/endpoint-catalog.test.ts`
  `--test-name-pattern "USGS Earthquake|usgsearthquake"`
- `node --import tsx --test test/contract/json-rpc.test.ts`
  `--test-name-pattern "USGS Earthquake|usgsearthquake"`
- direct CLI info/help, runtime text/JSON, invalid-argument, empty-state,
  boundary, endpoint, product-boundary, and content-boundary probes
- online `--persist` and offline replay with isolated `PUBLIC_APIS_HOME_DIR`
- `PUBLIC_APIS_LIVE_E2E=1 node --import tsx --test`
  `test/live-api/usgs-earthquake.test.ts`
- `npm run lint`
- `npm run typecheck`
- `npm run spec:validate`
- `npm run build:tarball`
- `npm run package:verify`
- `npm run quality:check` with lint, typecheck, spec validation, full test,
  and contract stages passing
- full test stage within `quality:check` with 1306 passing unit tests
- contract stage within `quality:check` with 194 passing contract tests
- `git diff --check`
- added-line width scan for touched files
- targeted secret scan over the current diff

## 残余不确定（Residual Uncertainty）

USGS near-real-time earthquake data can be revised after publication, and
provider availability remains dependent on the public USGS service. The
provider now fails clearly if future WAF/challenge HTML appears, and
cached/offline replay remains available for previously persisted requests.

## 参考（References）

- `evidence_7aa1ff0050f448abb7d68ccfb5a4fea3`
- `evidence_65979c099b4e4e2589f9c812dc7817be`
- `evidence_a5bad0ed25c34582a51c596e4df8fecd`
- `evidence_4344f31316234b6385bafa164b64224b`
