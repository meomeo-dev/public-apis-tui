# LectServe Provider 审计记录（Audit Record）- Audited

- Provider: LectServe
- Category: Calendar
- Catalog URL: `http://www.lectserve.com`
- Date: 2026-05-12 UTC
- Decision: audited
- Provider ID: `lectserve`
- Operations: `lectserve.date`, `lectserve.sunday`
- Research ID: `research_712f0029b18b4227b95ab72e7b392323`
- Artifact: `artifact_5a654697328e497d91e2227df262ebb1`

## 结论（Decision）

LectServe provider 通过 command-driven runtime/TUI audit。实现继续暴露
documented HTTPS JSON endpoints：

- `GET https://www.lectserve.com/date/{yyyy-mm-dd}`
- `GET https://www.lectserve.com/sunday`

CLI 只使用 explicit Gregorian date 和 server-relative upcoming Sunday
workflows，并在本地执行 lectionary 和 date validation。`/today`
server-time shortcut、undocumented `/sunday/{date}`、HTML pages、
arbitrary route proxying、BibleGateway content fetching、browser scraping、
browser clickstream、upload/delete/share workflows、binary/base64 payloads
和 mutating operations 均不暴露。

审计期间未观察到 Cloudflare challenge、CAPTCHA、gateway interstitial、
JavaScript redirect shell、parked-domain page、credential prompt 或
HTML-as-data。为满足 challenge regression guardrail，客户端已补充
provider-specific Cloudflare challenge HTML detection；未来 403/429
challenge HTML 会抛出明确 `OPEN_API_FAILED`，提示 retry later 或使用
cached/offline data，而不是普通 JSON parse failure。

## Runtime Audit

实际执行并观察：

- `node --import tsx src/cli.ts apis info lectserve`
- `node --import tsx src/cli.ts apis run lectserve.date --help`
- `node --import tsx src/cli.ts apis run lectserve.sunday --help`
- `node --import tsx src/cli.ts apis run lectserve.date`
  `--format text -- --date 2026-05-10 --lectionary acna`
- `node --import tsx src/cli.ts apis run lectserve.date`
  `--format json -- --date 2026-05-10 --lectionary rcl`
- `node --import tsx src/cli.ts apis run lectserve.sunday`
  `--format text -- --lectionary acna`
- `node --import tsx src/cli.ts apis run lectserve.sunday`
  `--format json -- --lectionary rcl`
- invalid probes for `--date 2026-02-30`, `--date 20260510`, and
  `--lectionary roman`
- online `--persist` followed by offline replay with isolated
  `PUBLIC_APIS_HOME_DIR` values for both operations

Representative outputs showed provider identity, endpoint, storage mode,
HTTPS JSON transport, open API/no-auth/no Chrome clickstream boundary,
query, alpha-quality note, daily readings, Sunday service readings, next
commands, and replay commands. Text output did not dump HTML pages, warning
pages, binary data, image bytes, or base64 data.

Invalid probes exited nonzero with `INVALID_ARGUMENT` and clear local
validation messages before any out-of-range request.

## Direct Endpoint Probes

Direct probes covered:

- `GET https://www.lectserve.com/api` returned HTTP 200
  `text/html; charset=utf-8` as documentation.
- `GET https://www.lectserve.com/date/2026-05-10?lect=acna` returned
  HTTP 200 `application/json; charset=UTF-8`.
- `GET https://www.lectserve.com/date/2026-05-10?lect=rcl` returned
  HTTP 200 `application/json; charset=UTF-8`.
- `GET https://www.lectserve.com/sunday?lect=acna` returned HTTP 200
  `application/json; charset=UTF-8`.
- `GET https://www.lectserve.com/today?lect=acna` returned HTTP 200
  JSON but remains excluded by provider boundary.
- `GET https://www.lectserve.com/sunday/2026-05-10?lect=acna` returned
  HTTP 404 `text/html; charset=UTF-8` and remains unexposed.

The exposed API routes returned normal lectionary JSON. No `cf-mitigated`
challenge header, Cloudflare server header, challenge title, CAPTCHA page,
JavaScript redirect shell, parked-domain page, or gateway interstitial was
observed. Server headers identified `nginx/1.18.0 (Ubuntu)`.

## 修复（Fix）

Updated `src/infrastructure/openApis/lectServeClient.ts` so response bodies
are read as text before JSON parsing. The client now detects representative
Cloudflare/challenge signals:

- `cf-mitigated: challenge`
- HTTP 403/429 `text/html`
- Cloudflare server header
- `Just a moment...` challenge title

Detected challenges throw:

- code: `OPEN_API_FAILED`
- message: LectServe is returning a Cloudflare challenge HTML page
- details: provider id, HTTP status, status text, content type, and URL

Updated `test/lectserve-client.test.ts` with a regression test that feeds
`cf-mitigated: challenge` and `Just a moment...` HTML into the client and
asserts a clear provider-specific error.

Existing non-JSON and non-OK errors now reuse shared response details.

## 验证（Validation）

Passed:

- `node --import tsx --test test/lectserve-client.test.ts`
- `node --import tsx --test test/cli-output.test.ts --test-name-pattern`
  `"LectServe"`
- `node --import tsx --test test/public-api-registry.test.ts`
  `--test-name-pattern "LectServe|lectserve"`
- `node --import tsx --test test/contract/json-rpc.test.ts`
  `--test-name-pattern "LectServe"`
- direct CLI info and help commands
- online `--persist` and offline replay with isolated `PUBLIC_APIS_HOME_DIR`
- direct endpoint probes for docs, exposed resources, `/today`, and
  undocumented `/sunday/{date}`
- `PUBLIC_APIS_LIVE_E2E=1 node --import tsx --test`
  `test/live-api/lectserve.test.ts`
- `npm run lint`
- `npm run typecheck`
- `npm run spec:validate`
- `npm run build:tarball`
- `npm run package:verify`
- `npm run quality:check` with lint, typecheck, spec validation, full test,
  and contract stages passing
- full `npm run test` within `quality:check` with 1290 passing tests
- `npm run test:contract` within `quality:check` with 194 passing tests
- `git diff --check`
- touched-file line-width scan for LectServe source, tests, and report
- targeted secret scan for LectServe source, tests, task row, and report

## 残余不确定（Residual Uncertainty）

LectServe is documented as alpha quality, so endpoint and JSON payload shape
may change. The provider now fails clearly if future WAF/challenge HTML
appears, and cached/offline replay remains available for previously persisted
requests.
