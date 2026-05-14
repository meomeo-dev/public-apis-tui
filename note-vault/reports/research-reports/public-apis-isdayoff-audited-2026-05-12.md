# isDayOff Provider 审计记录（Audit Record）- Audited

- Provider: isDayOff
- Category: Calendar
- Catalog URL: `https://isdayoff.ru`
- Date: 2026-05-12 UTC
- Decision: audited
- Provider ID: `isdayoff`
- Operations: `isdayoff.day`, `isdayoff.range`
- Research ID: `research_c1d887e4da97417f8c01437a035d4dbe`
- Artifact: `artifact_b35c65a7e42144e3adaec9cc7806e535`

## 结论（Decision）

isDayOff provider 通过 command-driven runtime/TUI audit。实现继续暴露
documented no-auth text status endpoint：

- `GET https://isdayoff.ru/api/getdata`

CLI 只使用 curated date、from/to、days、country code、include-shortened、
six-day 和 holiday controls。Responses are compact `text/plain` provider
codes, parsed into bounded JSON day records and readable text summaries.
Delimiter passthrough、raw text dumps、date aliases、arbitrary path proxying、
browser scraping/clickstream、upload/delete/share workflows、account behavior、
API-key paths、warning-as-data output、binary payloads 和 base64 payloads
均不暴露。

审计期间未观察到 Cloudflare challenge、CAPTCHA、gateway interstitial、
JavaScript redirect shell、parked-domain page、credential prompt 或
HTML-as-data。为满足 challenge regression guardrail，客户端已补充
provider-specific Cloudflare challenge HTML detection；未来 403/429
challenge HTML 会抛出明确 `OPEN_API_FAILED`，提示 retry later 或使用
cached/offline data，而不是被归类为 undocumented status code。

## Runtime Audit

实际执行并观察：

- `node --import tsx src/cli.ts apis info isdayoff`
- `node --import tsx src/cli.ts apis run isdayoff.day --help`
- `node --import tsx src/cli.ts apis run isdayoff.range --help`
- `node --import tsx src/cli.ts apis run isdayoff.day`
  `--online --format text -- --date 2026-05-11 --country-code ru`
- `node --import tsx src/cli.ts apis run isdayoff.day`
  `--online --format json -- --date 2026-05-12 --country-code us`
  `--include-shortened false --mark-holiday true`
- `node --import tsx src/cli.ts apis run isdayoff.range`
  `--online --format text -- --from 2026-05-10 --to 2026-05-12`
  `--country-code ru --six-day true --mark-holiday true`
- `node --import tsx src/cli.ts apis run isdayoff.range`
  `--online --format json -- --from 2026-05-10 --days 4`
  `--country-code ru --include-shortened true`
- invalid probes for `--country-code de`, `--date 2026-02-30`,
  `--days 367`, and reversed range `--from 2026-05-12 --to 2026-05-10`
- online `--persist` followed by offline replay with an isolated
  `PUBLIC_APIS_HOME_DIR` for both operations

Representative outputs showed provider identity, endpoint, storage mode,
HTTPS text/plain transport, open API/no-auth/no Chrome clickstream boundary,
query, parsed code meanings, totals, freshness warning, next commands, and
replay commands. Text output did not dump HTML pages, warning pages, raw text
payloads, binary data, image bytes, or base64 data.

Invalid probes exited nonzero with `INVALID_ARGUMENT` before out-of-scope
requests could be constructed.

## Direct Endpoint Probes

Direct probes covered:

- `GET https://isdayoff.ru/api/getdata?year=2026&month=5&day=11&cc=ru&pre=1`
  returned HTTP 200 `text/plain` with body `1`.
- `GET https://isdayoff.ru/api/getdata?date1=20260510&date2=20260512`
  `&cc=ru&pre=1` returned HTTP 200 `text/plain` with body `110`.
- `GET https://isdayoff.ru/api/getdata?year=2026&month=13&day=40&cc=ru`
  returned HTTP 400 `text/plain` with provider code `100`.
- `GET https://www.isdayoff.ru/docs/` returned HTTP 200 `text/html` and
  remains outside runtime data sources.

The exposed `getdata` routes returned compact provider status text. No
`cf-mitigated` challenge header, challenge title, CAPTCHA page, JavaScript
redirect shell, parked-domain page, gateway interstitial, or HTML-as-data was
observed.

## 修复（Fix）

Updated `src/infrastructure/openApis/isdayoffClient.ts` so response bodies are
read as text before status-code parsing. The client now detects
representative Cloudflare/challenge signals:

- `cf-mitigated: challenge`
- HTTP 403/429 `text/html`
- Cloudflare server header
- `Just a moment...` challenge title

Detected challenges throw:

- code: `OPEN_API_FAILED`
- message: isDayOff is returning a Cloudflare challenge HTML page
- details: provider id, HTTP status, status text, content type, and URL

Updated `test/isdayoff-client.test.ts` with a regression test that feeds
`cf-mitigated: challenge` and `Just a moment...` HTML into the client and
asserts a clear provider-specific error.

## 验证（Validation）

Passed:

- `node --import tsx --test test/isdayoff-client.test.ts`
- `node --import tsx --test test/cli-output.test.ts --test-name-pattern`
  `"isDayOff|isdayoff"`
- `node --import tsx --test test/public-api-registry.test.ts`
  `--test-name-pattern "isDayOff|isdayoff"`
- `node --import tsx --test test/contract/json-rpc.test.ts`
  `--test-name-pattern "isdayoff"`
- direct CLI info and help commands
- online `--persist` and offline replay with isolated `PUBLIC_APIS_HOME_DIR`
- direct endpoint probes for day, range, invalid provider code, and docs page
- `PUBLIC_APIS_LIVE_E2E=1 node --import tsx --test`
  `test/live-api/isdayoff.test.ts`
- `npm run lint`
- `npm run typecheck`
- `npm run spec:validate`
- `npm run build:tarball`
- `npm run package:verify`
- `npm run quality:check` with lint, typecheck, spec validation, full test,
  and contract stages passing
- full `npm run test` within `quality:check` with 1296 passing tests
- `npm run test:contract` within `quality:check` with 194 passing tests
- `git diff --check`
- touched-file line-width scan for isDayOff source, tests, and report
- targeted secret scan for isDayOff source, tests, task row, and report

## 残余不确定（Residual Uncertainty）

Provider database coverage varies by country and year, and business-critical
calendar decisions should still be validated against official local sources.
The provider now fails clearly if future WAF/challenge HTML appears, and
cached/offline replay remains available for previously persisted requests.
