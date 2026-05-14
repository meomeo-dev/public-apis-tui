# World Bank Provider 审计记录（Audit Record）- Audited

- Provider: World Bank
- Category: Science & Math
- Catalog URL: `https://datahelpdesk.worldbank.org/knowledgebase/topics/125589`
- Current docs: `https://datahelpdesk.worldbank.org/knowledgebase/articles/889392`
- Date: 2026-05-12 UTC
- Decision: audited
- Provider ID: `worldbank`
- Operations: `worldbank.countries`, `worldbank.indicator`
- Research ID: `research_ed6a4aeef6db4fafb755400ef6421670`
- Artifact: `artifact_8f1bea0d373e47238fe17518494843a3`

## 结论（Decision）

World Bank provider 通过 command-driven runtime/TUI audit。实现继续暴露
no-auth HTTPS JSON REST read-only World Bank API v2 routes:

- `GET https://api.worldbank.org/v2/country?format=json`
- `GET https://api.worldbank.org/v2/country/{country}/indicator/{indicator}`
- `GET https://api.worldbank.org/v2/indicator/{indicator}`

CLI 固定 `format=json`，只暴露 curated country、indicator、date、page
与 per-page controls。输出保持 bounded country metadata、indicator points、
indicator source metadata、pagination、storage mode 与 open-API boundary
projection。

Helpdesk HTML scraping、XML/HTML output mode、bulk download mirroring、
arbitrary route proxying、upload/delete/share workflows、browser clickstream、
binary payloads 与 base64 payloads remain excluded.

## Runtime Audit

实际执行并观察：

- `npx tsx src/cli.ts apis info worldbank`
- `npx tsx src/cli.ts apis run worldbank.countries --help`
- `npx tsx src/cli.ts apis run worldbank.indicator --help`
- `npx tsx src/cli.ts apis run worldbank.countries --format text`
  `-- --page 1 --per-page 4`
- `npx tsx src/cli.ts apis run worldbank.countries --format json`
  `-- --page 1 --per-page 3`
- `npx tsx src/cli.ts apis run worldbank.indicator --format text`
  `-- --country US --indicator SP.POP.TOTL --date 2020:2022 --per-page 3`
- `npx tsx src/cli.ts apis run worldbank.indicator --format json`
  `-- --country WLD --indicator NY.GDP.MKTP.CD --date 2021:2023 --per-page 3`
- invalid probes for date range, country code, indicator path, page, and
  per-page bounds
- upstream message probe with unknown country `ZZ`
- online `--persist` followed by offline replay with isolated
  `PUBLIC_APIS_HOME_DIR`

Representative outputs showed provider identity, endpoint, storage mode,
HTTPS JSON REST transport, no-auth/open REST boundary, no Chrome clickstream
boundary, query summary, pagination, again/replay commands, and next commands.
Text output did not dump docs HTML, XML, raw bulk payloads, binary data, or
base64 data.

Invalid local parameters exited nonzero with `INVALID_ARGUMENT`. Unknown
provider country values returned a World Bank JSON message payload and were
surfaced as `OPEN_API_FAILED`, not as business data.

## Direct Endpoint Probes

Direct probes covered:

- stale public-apis Help Desk topic; returned HTTP 404 `text/html`.
- current official Indicators API article; reachable documentation page.
- countries JSON route; returned HTTP 200 `application/json;charset=utf-8`.
- countries default route without `format=json`; returned HTTP 200 `text/xml`
  and remains outside CLI projection.
- country indicator route; returned HTTP 200 `application/json;charset=utf-8`.
- indicator metadata route; returned HTTP 200 `application/json;charset=utf-8`.
- invalid country indicator route; returned HTTP 200 JSON message payload.
- API root and missing route; returned HTTP 404 HTML/XML-style pages outside
  CLI projection.

World Bank routes reported Cloudflare server headers, but no
`cf-mitigated: challenge`, Cloudflare challenge title, CAPTCHA page,
JavaScript redirect shell, parked-domain page, gateway interstitial,
credential flow, browser clickstream, binary runtime payload, or base64 runtime
payload was observed.

## 修复（Fix）

Updated provider metadata and usecase docs URL from the stale Help Desk topic
to the current official Indicators API documentation article.

Updated `src/infrastructure/openApis/worldBankClient.ts` so response bodies
are read as text, checked for representative challenge signals, then parsed as
JSON:

- HTTP 403/429 `text/html`
- `cf-mitigated: challenge`
- Cloudflare server header
- `Just a moment...` challenge title
- CAPTCHA, access-denied, and attention-required HTML markers

Detected challenges throw:

- code: `OPEN_API_FAILED`
- message: World Bank is returning a challenge HTML page
- details: provider id, HTTP status, status text, content type, and URL

Updated `test/world-bank-client.test.ts` with regression coverage for
challenge HTML. Updated World Bank text renderer wording from `page` to
`pagination` to avoid the confusing `page page` prefix.

## 验证（Validation）

Passed:

- `node --import tsx --test test/world-bank-client.test.ts`
- `node --import tsx --test test/cli-output.test.ts --test-name-pattern`
  `"World Bank|worldbank"`
- `node --import tsx --test test/public-api-registry.test.ts`
  `--test-name-pattern "World Bank|worldbank"`
- `node --import tsx --test test/endpoint-catalog.test.ts`
  `--test-name-pattern "World Bank|worldbank"`
- `node --import tsx --test test/contract/json-rpc.test.ts`
  `--test-name-pattern "World Bank|worldbank"`
- direct CLI info/help, runtime text/JSON, invalid-argument,
  provider-message, direct endpoint, and challenge-boundary probes
- online `--persist` and offline replay with isolated `PUBLIC_APIS_HOME_DIR`
- `PUBLIC_APIS_LIVE_E2E=1 node --import tsx --test`
  `test/live-api/world-bank.test.ts`
- `npm run lint`
- `npm run typecheck`
- `npm run spec:validate`
- `npm run build:tarball`
- `npm run package:verify`
- `npm run quality:check` with lint, typecheck, spec validation, full test,
  and contract stages passing
- full test stage within `quality:check` with 1310 passing unit tests
- contract stage within `quality:check` with 194 passing contract tests

## 残余不确定（Residual Uncertainty）

World Bank API v2 did not publish a specific quota or SLA in the audited
surface. Defaults remain bounded, date ranges remain capped, and no bulk crawl
mode is exposed. The provider now fails clearly if future WAF/challenge HTML
appears, and cached/offline replay remains available for previously persisted
requests.

## 参考（References）

- `evidence_7db5a9fcd8ac41d39c3c683986d7574f`
- `evidence_34d09118a7f94fd28a1906a705c393d8`
- `evidence_08fb60a33adc4356acbfb4a4ac2b0e34`
- `evidence_dbc3b10d604b44b0896a78218c8e5288`
