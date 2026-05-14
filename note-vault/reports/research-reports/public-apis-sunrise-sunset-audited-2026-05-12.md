# Sunrise-Sunset Provider 审计记录（Audit Record）- Audited

- Provider: Sunrise and Sunset
- Category: Science & Math
- Catalog URL: `https://sunrise-sunset.org/api`
- Date: 2026-05-12 UTC
- Decision: audited
- Provider ID: `sunrisesunset`
- Operations: `sunrisesunset.times`
- Research ID: `research_3dc33229f50643409d545c93d0ed22d8`
- Artifact: `artifact_a8357fb350884487840b30c693f8fd80`

## 结论（Decision）

Sunrise-Sunset provider 通过 command-driven runtime/TUI audit。实现继续
暴露 no-auth HTTPS JSON REST endpoint:

- `GET https://api.sunrise-sunset.org/json`

CLI 只使用 curated latitude、longitude、date 与 tzid controls，并固定
`formatted=0` 以取得 ISO 风格 JSON 时间。相对日期 passthrough、JSONP
callback、任意路由代理、docs HTML scraping、browser clickstream、
账号流程、binary payloads 与 base64 payloads remain excluded。

审计期间暴露运行时端点返回正常 JSON。未观察到 403/429 HTML
Cloudflare challenge、`cf-mitigated: challenge`、`Just a moment...` title、
CAPTCHA、
gateway interstitial、credential flow、binary payload 或 base64 payload。
`server: cloudflare` 只作为托管层信号出现，不是 challenge。Polar probes
确认上游会用 `1970-01-01T00:00:01+00:00` 表示不可用事件；文本输出
现在把该值标记为 unavailable，而不是展示为真实太阳事件时间。

## Runtime Audit

实际执行并观察：

- `npx tsx src/cli.ts apis info sunrisesunset`
- `npx tsx src/cli.ts apis run sunrisesunset.times --help`
- `npx tsx src/cli.ts apis run sunrisesunset.times --format text`
  `-- --latitude 36.72016 --longitude -4.42034`
  `--date 2026-05-11 --tzid UTC`
- `npx tsx src/cli.ts apis run sunrisesunset.times --format json`
  `-- --latitude 40.7128 --longitude -74.0060`
  `--date 2026-06-21 --tzid America/New_York`
- invalid probes for relative date, latitude, longitude, tzid,
  invalid Gregorian date, and path-like tzid
- boundary text probes for latitude `-90` and `90`
- online `--persist` followed by offline replay with isolated
  `PUBLIC_APIS_HOME_DIR`

Representative outputs showed provider identity, endpoint, storage mode,
HTTPS JSON REST transport, no-auth/open REST boundary, no Chrome clickstream
boundary, query summary, solar events, attribution, next command, and replay
command. Text output did not dump HTML, warning pages, binary data, base64 data,
JSONP wrapper text, or unbounded upstream payloads.

Invalid relative date, out-of-range coordinates, invalid timezone, invalid
calendar date, and unsafe path-like timezone probes exited nonzero before unsafe
requests could be built.

## Direct Endpoint Probes

Direct probes covered:

- documented JSON route with `formatted=0` and `tzid=UTC`; returned HTTP 200
  `application/json`.
- polar route with `lat=90&lng=0`; returned HTTP 200 JSON with 1970 sentinel
  values for unavailable sunrise/sunset/twilight events.
- invalid latitude route with `lat=91`; returned HTTP 200 JSON with 1970
  sentinel behavior, so CLI must continue blocking invalid coordinates locally.
- invalid tzid route; returned HTTP 200 JSON, so CLI must continue blocking
  invalid timezone IDs locally.
- JSONP boundary with `callback=cb`; returned wrapped `cb({...})` text and
  remains excluded.
- documentation page; returned HTTP 200 `text/html` and remains outside runtime
  data sources.

The exposed runtime route returned normal JSON. No challenge header, challenge
title, CAPTCHA page, JavaScript redirect shell, parked-domain page, gateway
interstitial, credential flow, binary payload, or base64 payload was observed.

## 修复（Fix）

Updated `src/infrastructure/openApis/sunriseSunsetClient.ts` so response bodies
are read as text, checked for representative Cloudflare/challenge signals, then
parsed as JSON:

- HTTP 403/429 `text/html`
- `cf-mitigated: challenge`
- Cloudflare server header
- `Just a moment...` challenge title

Detected challenges throw:

- code: `OPEN_API_FAILED`
- message: Sunrise-Sunset is returning a Cloudflare challenge HTML page
- details: provider id, HTTP status, status text, content type, and URL

Updated `src/interfaces/cli/output.ts` so Sunrise-Sunset text output renders
`1970-01-01T00:00:00/01` solar event sentinel values as:

- `unavailable (provider 1970 sentinel)`

Updated `test/sunrise-sunset-client.test.ts` and `test/cli-output.test.ts` with
regression coverage for challenge HTML and polar sentinel display.

## 验证（Validation）

Passed:

- `node --import tsx --test test/sunrise-sunset-client.test.ts`
- `node --import tsx --test test/cli-output.test.ts --test-name-pattern`
  `"Sunrise|sunrisesunset"`
- `node --import tsx --test test/public-api-registry.test.ts`
  `--test-name-pattern "Sunrise|sunrisesunset"`
- `node --import tsx --test test/endpoint-catalog.test.ts`
  `--test-name-pattern "Sunrise|sunrisesunset"`
- `node --import tsx --test test/contract/json-rpc.test.ts`
  `--test-name-pattern "Sunrise|sunrisesunset"`
- direct CLI info/help, runtime text/JSON, invalid-argument, boundary,
  endpoint, and content-boundary probes
- online `--persist` and offline replay with isolated `PUBLIC_APIS_HOME_DIR`
- `PUBLIC_APIS_LIVE_E2E=1 node --import tsx --test`
  `test/live-api/sunrise-sunset.test.ts`
- `npm run lint`
- `npm run typecheck`
- `npm run spec:validate`
- `npm run build:tarball`
- `npm run package:verify`
- `npm run quality:check` with lint, typecheck, spec validation, full test,
  and contract stages passing
- full `npm run test` within `quality:check` with 1303 passing tests
- `npm run test:contract` within `quality:check` with 194 passing tests
- `git diff --check`
- added-line width scan for touched lines
- targeted secret scan over the current diff

## 残余不确定（Residual Uncertainty）

Sunrise-Sunset availability remains dependent on the unauthenticated public
service and its Cloudflare policy. The provider now fails clearly if future
challenge HTML appears, and cached/offline replay remains available for
previously persisted requests. Polar and invalid-upstream 1970 sentinel
behavior is provider-specific; CLI blocks invalid local input and annotates
polar unavailable events in text mode.
