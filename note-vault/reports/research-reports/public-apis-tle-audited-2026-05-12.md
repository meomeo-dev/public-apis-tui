# TLE Provider 审计记录（Audit Record）- Audited

- Provider: TLE
- Category: Science & Math
- Catalog URL: `https://tle.ivanstanojevic.me/#/docs`
- Date: 2026-05-12 UTC
- Decision: audited
- Provider ID: `tle`
- Operations: `tle.search`, `tle.satellite`
- Research ID: `research_88d22f9ac6984c6a8e3ae5f82b481b56`
- Artifact: `artifact_df8c8a91117f438fa945de89ce3cce00`

## 结论（Decision）

TLE provider 通过 command-driven runtime/TUI audit。实现继续暴露 no-auth
HTTPS JSON REST endpoints:

- `GET https://tle.ivanstanojevic.me/api/tle/`
- `GET https://tle.ivanstanojevic.me/api/tle/{satelliteId}`

CLI 只使用 curated satellite name search、page 与 NORAD satellite id
controls；默认 `ISS`、page `1`、satellite id `25544`，并将上游固定 page
size 20 明确投影到 JSON 与 text 输出。Google Maps UI、SPA routes、browser
scraping/clickstream、任意 route proxying、bulk CelesTrak downloads、
image/binary payloads、base64 payloads、upload/delete/share workflows、账号
行为、credential paths 与 warning-as-data output remain excluded。

暴露运行时端点返回正常 JSON。未观察到 403/429 HTML Cloudflare
challenge、`cf-mitigated: challenge`、`Just a moment...` title、CAPTCHA、
gateway
interstitial、credential flow、binary payload 或 base64 payload。Docs SPA
返回 HTML，但只作为文档页面，未进入 runtime data boundary。

## Runtime Audit

实际执行并观察：

- `npx tsx src/cli.ts apis info tle`
- `npx tsx src/cli.ts apis run tle.search --help`
- `npx tsx src/cli.ts apis run tle.satellite --help`
- `npx tsx src/cli.ts apis run tle.search --format text`
  `-- --search ISS --page 1`
- `npx tsx src/cli.ts apis run tle.satellite --format json`
  `-- --satellite-id 25544`
- `npx tsx src/cli.ts apis run tle.search --format json`
  `-- --search NOAA --page 2`
- empty-state probe with search `zznotfoundzz`
- boundary probe with page `2000`
- invalid probes for short search, path-like search, page `0`, and satellite
  id `0`
- online `--persist` followed by offline replay with isolated
  `PUBLIC_APIS_HOME_DIR` for both operations

Representative outputs showed provider identity, endpoint, storage mode,
HTTPS JSON REST transport, no-auth/open REST boundary, no Chrome clickstream
boundary, query summary, pagination, source, satellite summary, next page,
again/replay commands, and open-first command. Text output did not dump HTML,
warning pages, binary data, base64 data, raw Hydra objects, map UI data, or
unbounded upstream payloads.

Invalid short search, unsafe path-like search, invalid page, and invalid
satellite id probes exited nonzero with `INVALID_ARGUMENT` before unsafe
requests could be built.

## Direct Endpoint Probes

Direct probes covered:

- `GET /api/tle/?search=ISS&page=1`; returned HTTP 200 `application/json`.
- `GET /api/tle/25544`; returned HTTP 200 `application/json`.
- empty search route; returned HTTP 200 `application/json` with zero members.
- invalid id route `/api/tle/0`; returned HTTP 404 `application/json` and was
  not treated as normal satellite data.
- JSONP callback boundary; returned normal JSON and remains outside CLI
  controls.
- docs SPA; returned HTTP 200 `text/html` and remains outside runtime data
  sources.
- missing API route; returned HTTP 404 `application/json` and was not treated
  as operation data.

The runtime routes used `server: Apache`; no `cf-mitigated` header, challenge
title, CAPTCHA page, JavaScript redirect shell, parked-domain page, gateway
interstitial, credential flow, binary payload, or base64 payload was observed.

## 修复（Fix）

Updated `src/infrastructure/openApis/tleClient.ts` so response bodies are read
as text, checked for representative Cloudflare/challenge signals, then parsed
as JSON:

- HTTP 403/429 `text/html`
- `cf-mitigated: challenge`
- Cloudflare server header
- `Just a moment...` challenge title

Detected challenges throw:

- code: `OPEN_API_FAILED`
- message: TLE API is returning a Cloudflare challenge HTML page
- details: provider id, HTTP status, status text, content type, and URL

Updated `test/tle-client.test.ts` with regression coverage for challenge HTML.

## 验证（Validation）

Passed:

- `node --import tsx --test test/tle-client.test.ts`
- `node --import tsx --test test/cli-output.test.ts --test-name-pattern`
  `"TLE|tle"`
- `node --import tsx --test test/public-api-registry.test.ts`
  `--test-name-pattern "TLE|tle"`
- `node --import tsx --test test/endpoint-catalog.test.ts`
  `--test-name-pattern "TLE|tle"`
- `node --import tsx --test test/contract/json-rpc.test.ts`
  `--test-name-pattern "TLE|tle"`
- direct CLI info/help, runtime text/JSON, invalid-argument, empty-state,
  boundary, endpoint, and content-boundary probes
- online `--persist` and offline replay with isolated `PUBLIC_APIS_HOME_DIR`
- `PUBLIC_APIS_LIVE_E2E=1 node --import tsx --test test/live-api/tle.test.ts`
- `npm run lint`
- `npm run typecheck`
- `npm run spec:validate`
- `npm run build:tarball`
- `npm run package:verify`
- `npm run quality:check` with lint, typecheck, spec validation, full test,
  and contract stages passing
- full `npm run test` within `quality:check` with 1304 passing tests
- `npm run test:contract` within `quality:check` with 194 passing tests
- `git diff --check`
- added-line width scan for touched lines
- targeted secret scan over the current diff

## 残余不确定（Residual Uncertainty）

TLE data freshness remains dependent on the public provider and its CelesTrak
source update cadence. Provider availability remains dependent on the
unauthenticated public service. The provider now fails clearly if future
WAF/challenge HTML appears, and cached/offline replay remains available for
previously persisted requests.
