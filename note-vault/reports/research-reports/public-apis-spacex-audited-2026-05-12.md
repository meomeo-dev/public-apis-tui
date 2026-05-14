# SpaceX Provider 审计记录（Audit Record）- Audited

- Provider: SpaceX REST
- Category: Science & Math
- Catalog URL: `https://github.com/r-spacex/SpaceX-API`
- Date: 2026-05-12 UTC
- Decision: audited
- Provider ID: `spacex`
- Operations: `spacex.company`, `spacex.rockets`, `spacex.launchpads`,
  `spacex.launches`
- Research ID: `research_075f58d7a41f4c7784dcbd18d223747d`
- Artifact: `artifact_3837036b81e042a7a7f8a0233f9a9bb7`

## 结论（Decision）

SpaceX provider 通过 command-driven runtime/TUI audit。实现继续暴露
no-auth HTTPS JSON REST metadata endpoints:

- `GET https://api.spacexdata.com/v4/company`
- `GET https://api.spacexdata.com/v4/rockets`
- `GET https://api.spacexdata.com/v4/launchpads`
- `POST https://api.spacexdata.com/v5/launches/query`

CLI 只使用 curated company、rocket、launchpad 和 launch filters；rockets 与
launchpads 对小型列表做本地搜索和分页；launches 构造 bounded provider
query body，限制 name、upcoming、success、rocket、launchpad、date window、
sort、limit 和 page controls。Raw Mongo/Mongoose query/options passthrough、
GraphQL、mutations、`spacex-key` authenticated routes、image/media downloads、
HTML scraping、Chrome clickstream、upload/delete/share workflows、binary
payloads 和 base64 payloads remain excluded。

审计期间暴露运行时端点均返回正常 JSON。未观察到 403/429 HTML
Cloudflare challenge、`cf-mitigated: challenge`、`Just a moment...` title、
CAPTCHA、gateway interstitial、credential flow、binary payload 或 base64
payload。`server: cloudflare` 只作为托管层信号出现，不是 challenge。
Direct raw match-all launch query upstream returns JSON and therefore remains
a confirmed boundary that CLI must not expose.

## Runtime Audit

实际执行并观察：

- `npx tsx src/cli.ts apis info spacex`
- `npx tsx src/cli.ts apis run spacex.company --help`
- `npx tsx src/cli.ts apis run spacex.rockets --help`
- `npx tsx src/cli.ts apis run spacex.launchpads --help`
- `npx tsx src/cli.ts apis run spacex.launches --help`
- `npx tsx src/cli.ts apis run spacex.company --format text`
- `npx tsx src/cli.ts apis run spacex.rockets --format text`
  `-- --search Falcon --active true --limit 2`
- `npx tsx src/cli.ts apis run spacex.launchpads --format json`
  `-- --status active --limit 2`
- `npx tsx src/cli.ts apis run spacex.launches --format json`
  `-- --name Crew --upcoming false --limit 2`
- `npx tsx src/cli.ts apis run spacex.launches --format text`
  `-- --name Crew --upcoming false --success true`
  `--rocket 5e9d0d95eda69973a809d1ec`
  `--launchpad 5e9e4502f509094188566f88`
  `--start 2022-01-01 --end 2022-12-31 --sort flight-asc --limit 2`
- empty state probes for rockets, launchpads, and launches using
  `zznotfoundzz`
- invalid probes for raw query syntax, invalid status, limit, offset, page,
  rocket id, date, and sort
- online `--persist` followed by offline replay with isolated
  `PUBLIC_APIS_HOME_DIR` for company and launches

Representative outputs showed provider identity, endpoint, storage mode,
HTTPS JSON REST transport, no-auth/open REST boundary, no Chrome clickstream
boundary, query/filter summary, pagination, launch references, external links,
empty-state remediation, next commands, and replay commands. Text output did
not dump HTML pages, warning pages, binary data, base64 data, raw Mongo query
objects, image bytes, or unbounded upstream payloads.

Invalid raw query syntax, unsafe status, out-of-range pagination, invalid
object id, invalid date, and invalid sort probes exited nonzero with
`INVALID_ARGUMENT` before unsafe requests could be built.

## Direct Endpoint Probes

Direct probes covered:

- `GET https://api.spacexdata.com/v4/company` returned HTTP 200
  `application/json; charset=utf-8`.
- `GET https://api.spacexdata.com/v4/rockets` returned HTTP 200
  `application/json; charset=utf-8`.
- `GET https://api.spacexdata.com/v4/launchpads` returned HTTP 200
  `application/json; charset=utf-8`.
- `POST https://api.spacexdata.com/v5/launches/query` with the CLI-shaped
  body returned HTTP 200 `application/json; charset=utf-8`.
- The same launch query route with a raw match-all body also returned HTTP 200
  JSON upstream and remains outside the CLI boundary.
- `GET https://github.com/r-spacex/SpaceX-API` returned HTTP 200 `text/html`
  documentation and remains outside runtime data sources.
- `GET https://api.spacexdata.com/v4/unknown-public-apis-tui` returned HTTP
  404 `text/plain; charset=utf-8` and was not treated as data.

The runtime API routes returned normal JSON. No challenge header, challenge
title, CAPTCHA page, JavaScript redirect shell, parked-domain page, gateway
interstitial, credential flow, binary payload, or base64 payload was observed.

## 修复（Fix）

Updated `src/infrastructure/openApis/spaceXClient.ts` so response bodies are
read as text, checked for representative Cloudflare/challenge signals, then
parsed as JSON:

- `cf-mitigated: challenge`
- HTTP 403/429 `text/html`
- Cloudflare server header
- `Just a moment...` challenge title

Detected challenges throw:

- code: `OPEN_API_FAILED`
- message: SpaceX is returning a Cloudflare challenge HTML page
- details: provider id, HTTP status, status text, content type, and URL

Updated `test/spacex-client.test.ts` with a regression test that feeds
`cf-mitigated: challenge` and `Just a moment...` HTML into the client and
asserts a clear provider-specific error.

## 验证（Validation）

Passed:

- `node --import tsx --test test/spacex-client.test.ts`
- `node --import tsx --test test/cli-output.test.ts --test-name-pattern`
  `"SpaceX|spacex"`
- `node --import tsx --test test/public-api-registry.test.ts`
  `--test-name-pattern "SpaceX|spacex"`
- `node --import tsx --test test/endpoint-catalog.test.ts`
  `--test-name-pattern "SpaceX|spacex"`
- `node --import tsx --test test/contract/json-rpc.test.ts`
  `--test-name-pattern "SpaceX|spacex"`
- direct CLI info and help commands
- direct runtime text/JSON, empty-state, invalid-argument, endpoint, and
  content-boundary probes
- online `--persist` and offline replay with isolated `PUBLIC_APIS_HOME_DIR`
- `PUBLIC_APIS_LIVE_E2E=1 node --import tsx --test`
  `test/live-api/spacex.test.ts`
- `npm run lint`
- `npm run typecheck`
- `npm run spec:validate`
- `npm run build:tarball`
- `npm run package:verify`
- `npm run quality:check` with lint, typecheck, spec validation, full test,
  and contract stages passing
- full `npm run test` within `quality:check` with 1301 passing tests
- `npm run test:contract` within `quality:check` with 194 passing tests

A first `npm run quality:check` attempt hit the 900 second tool timeout during
`npm run test` without observed failures. The full gate was rerun with a longer
timeout and passed.

## 残余不确定（Residual Uncertainty）

SpaceX REST data is a community-maintained public API and may lag current
SpaceX operations or change ordering/counts over time. Provider availability
remains dependent on `api.spacexdata.com` uptime and unauthenticated traffic
policy. The provider now fails clearly if future WAF/challenge HTML appears,
and cached/offline replay remains available for previously persisted requests.
