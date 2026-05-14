# Noctua Provider 审计记录（Audit Record）- Audited

- Provider: Noctua
- Category: Science & Math
- Catalog URL: `https://api.noctuasky.com/api/v1/swaggerdoc/`
- Date: 2026-05-12 UTC
- Decision: audited
- Provider ID: `noctua`
- Operations: `noctua.stats`, `noctua.source`
- Research ID: `research_53e9425d09b44459843a626e59b888da`
- Artifact: `artifact_f5421e265ce143dbbc174d59f966eb5c`

## 结论（Decision）

Noctua provider 通过 command-driven runtime/TUI audit。实现继续暴露
documented HTTPS JSON endpoints：

- `GET https://api.noctuasky.com/api/v1/skysources/stats/`
- `GET https://api.noctuasky.com/api/v1/skysources/name/{name}`

CLI 只使用 curated database type counts 和 exact-name source lookup。
Source name defaults to `Mars`; slash and control characters are rejected
locally. Text output projects selected `model_data` fields and truncates long
orbit strings instead of dumping the raw upstream payload.

Authenticated locations、observations、users、login、account creation、
password/account workflows、arbitrary route proxying、browser scraping、
upload/delete/share workflows、binary/base64 payloads、and the documented list
query remain excluded. The list query returned HTTP 200 JSON empty arrays in
audit probes and is not exposed as a user workflow.

审计期间未观察到 Cloudflare challenge、CAPTCHA、gateway interstitial、
JavaScript redirect shell、parked-domain page、credential prompt 或
HTML-as-data。为满足 challenge regression guardrail，客户端已补充
provider-specific Cloudflare challenge HTML detection；未来 403/429
challenge HTML 会抛出明确 `OPEN_API_FAILED`，提示 retry later 或使用
cached/offline data，而不是普通 JSON parse failure。

## Runtime Audit

实际执行并观察：

- `node --import tsx src/cli.ts apis info noctua`
- `node --import tsx src/cli.ts apis run noctua.stats --help`
- `node --import tsx src/cli.ts apis run noctua.source --help`
- `node --import tsx src/cli.ts apis run noctua.stats --format text`
- `node --import tsx src/cli.ts apis run noctua.stats --format json`
- `node --import tsx src/cli.ts apis run noctua.source`
  `--format text -- --name Mars`
- `node --import tsx src/cli.ts apis run noctua.source`
  `--format json -- --name Mars`
- `node --import tsx src/cli.ts apis run noctua.source`
  `--format json -- --name "NAME Mars"`
- unknown source probe for `DefinitelyNotASkySource12345`
- invalid path/control probe for `../users/me`
- online `--persist` followed by offline replay with an isolated
  `PUBLIC_APIS_HOME_DIR` for both operations

Representative outputs showed provider identity, endpoint, storage mode,
HTTPS JSON transport, open API/no-auth/no Chrome clickstream boundary,
query, source metadata, model fields, next commands, and replay commands.
Text output did not dump HTML pages, warning pages, binary data, image bytes,
or base64 data.

The unknown source probe returned a clear provider failure instead of a false
empty success. The slash/control probe failed local validation before an
unsafe path-like request could be constructed.

## Direct Endpoint Probes

Direct probes covered:

- `GET https://api.noctuasky.com/api/v1/skysources/stats/` returned HTTP 200
  `application/json`.
- `GET https://api.noctuasky.com/api/v1/skysources/name/Mars` returned HTTP
  200 `application/json`.
- `GET https://api.noctuasky.com/api/v1/openapi.json` returned HTTP 200
  `application/json`.
- `GET https://api.noctuasky.com/api/v1/users/me` returned HTTP 401
  `application/json` with `Missing Authorization Header`.
- `GET https://api.noctuasky.com/api/v1/skysources/?name=Mars` returned HTTP
  200 `application/json` with an empty array and remains unexposed.

The exposed API routes returned normal JSON. No `cf-mitigated` challenge
header, challenge title, CAPTCHA page, JavaScript redirect shell,
parked-domain page, or gateway interstitial was observed. Responses were
served by nginx during the audit window.

## 修复（Fix）

Updated `src/infrastructure/openApis/noctuaClient.ts` so response bodies are
read as text before JSON parsing. The client now detects representative
Cloudflare/challenge signals:

- `cf-mitigated: challenge`
- HTTP 403/429 `text/html`
- Cloudflare server header
- `Just a moment...` challenge title

Detected challenges throw:

- code: `OPEN_API_FAILED`
- message: Noctua is returning a Cloudflare challenge HTML page
- details: provider id, HTTP status, status text, content type, and URL

Updated `test/noctua-client.test.ts` with a regression test that feeds
`cf-mitigated: challenge` and `Just a moment...` HTML into the client and
asserts a clear provider-specific error.

Existing non-JSON and non-OK errors now reuse shared response details.

## 验证（Validation）

Passed:

- `node --import tsx --test test/noctua-client.test.ts`
- `node --import tsx --test test/cli-output.test.ts --test-name-pattern`
  `"Noctua"`
- `node --import tsx --test test/public-api-registry.test.ts`
  `--test-name-pattern "Noctua|noctua"`
- `node --import tsx --test test/contract/json-rpc.test.ts`
  `--test-name-pattern "Noctua|noctua"`
- direct CLI info and help commands
- online `--persist` and offline replay with isolated `PUBLIC_APIS_HOME_DIR`
- direct endpoint probes for stats, source, OpenAPI, account boundary, and
  unexposed list query
- `PUBLIC_APIS_LIVE_E2E=1 node --import tsx --test`
  `test/live-api/noctua.test.ts`
- `npm run lint`
- `npm run typecheck`
- `npm run spec:validate`
- `npm run build:tarball`
- `npm run package:verify`
- `npm run quality:check` with lint, typecheck, spec validation, full test,
  and contract stages passing
- full `npm run test` within `quality:check` with 1294 passing tests
- `npm run test:contract` within `quality:check` with 194 passing tests
- `git diff --check`
- touched-file line-width scan for Noctua source, tests, and report
- targeted secret scan for Noctua source, tests, task row, and report

## 残余不确定（Residual Uncertainty）

Noctua does not publish a public SLA for the selected routes. The provider
now fails clearly if future WAF/challenge HTML appears, and cached/offline
replay remains available for previously persisted requests.
