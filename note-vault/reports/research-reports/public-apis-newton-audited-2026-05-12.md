# Newton Provider 审计记录（Audit Record）- Audited

- Provider: Newton
- Category: Science & Math
- Catalog URL: `https://newton.vercel.app`
- Date: 2026-05-12 UTC
- Decision: audited
- Provider ID: `newton`
- Operation: `newton.compute`
- Research ID: `research_54a01726d6c049b8b49fcd6c44115a5c`
- Artifact: `artifact_23f491b9e3364d3f9b48ef26c3b95749`

## 结论（Decision）

Newton provider 通过 command-driven runtime/TUI audit。实现继续暴露
documented HTTPS JSON endpoint：

- `GET https://newton.vercel.app/api/v2/{operation}/{expression}`

CLI 只使用 curated operation whitelist 和 bounded math expression。Slashes
are encoded as the documented `(over)` token, expression length is capped at
160 characters, and non-math characters are rejected locally. Arbitrary
operation proxying、arbitrary route forwarding、browser scraping、
browser clickstream、HTML parsing、code execution surfaces、image/binary
rendering、base64 payloads、upload/delete/share workflows、account behavior
和 warning-as-data output 均不暴露。

审计期间未观察到 Cloudflare challenge、CAPTCHA、gateway interstitial、
JavaScript redirect shell、parked-domain page、credential prompt 或
HTML-as-data。为满足 challenge regression guardrail，客户端已补充
provider-specific Cloudflare challenge HTML detection；未来 403/429
challenge HTML 会抛出明确 `OPEN_API_FAILED`，提示 retry later 或使用
cached/offline data，而不是普通 JSON parse failure。

## Runtime Audit

实际执行并观察：

- `node --import tsx src/cli.ts apis info newton`
- `node --import tsx src/cli.ts apis run newton.compute --help`
- `node --import tsx src/cli.ts apis run newton.compute`
  `--format text -- --operation simplify --expression "2^2+2(2)"`
- `node --import tsx src/cli.ts apis run newton.compute`
  `--format json -- --operation simplify --expression "2^2+2(2)"`
- `node --import tsx src/cli.ts apis run newton.compute`
  `--format text -- --operation derive --expression "x^2"`
- `node --import tsx src/cli.ts apis run newton.compute`
  `--format json -- --operation zeroes --expression "x^2+2x"`
- `node --import tsx src/cli.ts apis run newton.compute`
  `--format text -- --operation log --expression "2|8"`
- `node --import tsx src/cli.ts apis run newton.compute`
  `--format json -- --operation area --expression "2:4|x^2"`
- invalid probes for `--operation evaluate`,
  `--expression "x; process.exit()"`, and `--expression "x+"`
- online `--persist` followed by offline replay with an isolated
  `PUBLIC_APIS_HOME_DIR`

Representative outputs showed provider identity, endpoint, storage mode,
HTTPS JSON transport, open API/no-auth/no Chrome clickstream boundary,
query, engine, expression policy, calculation result, supported operations,
next commands, and replay commands. Text output did not dump HTML pages,
warning pages, binary data, image bytes, or base64 data.

Invalid operation and unsafe expression probes exited nonzero with
`INVALID_ARGUMENT` before request. The syntax-warning probe exited nonzero
with `OPEN_API_FAILED`, confirming upstream warning-as-data is not rendered
as a valid calculation.

## Direct Endpoint Probes

Direct probes covered:

- `GET https://newton.vercel.app/api/v2/simplify/2%5E2%2B2(2)` returned
  HTTP 200 `application/json; charset=utf-8` with result `8`.
- `GET https://newton.vercel.app/api/v2/evaluate/2%2B2` returned HTTP 400
  `application/json; charset=utf-8` with `Unknown operation`.
- `GET https://github.com/aunyks/newton-api` returned HTTP 200 `text/html`
  as the documentation page and remains outside runtime data sources.

The exposed API route returned normal calculation JSON. No `cf-mitigated`
challenge header, challenge title, CAPTCHA page, JavaScript redirect shell,
parked-domain page, or gateway interstitial was observed. API responses were
served by Vercel without challenge mitigation.

## 修复（Fix）

Updated `src/infrastructure/openApis/newtonClient.ts` so response bodies are
read as text before JSON parsing. The client now detects representative
Cloudflare/challenge signals:

- `cf-mitigated: challenge`
- HTTP 403/429 `text/html`
- Cloudflare server header
- `Just a moment...` challenge title

Detected challenges throw:

- code: `OPEN_API_FAILED`
- message: Newton is returning a Cloudflare challenge HTML page
- details: provider id, HTTP status, status text, content type, and URL

Updated `test/newton-client.test.ts` with a regression test that feeds
`cf-mitigated: challenge` and `Just a moment...` HTML into the client and
asserts a clear provider-specific error.

Existing non-JSON and non-OK errors now reuse shared response details.

## 验证（Validation）

Passed:

- `node --import tsx --test test/newton-client.test.ts`
- `node --import tsx --test test/cli-output.test.ts --test-name-pattern`
  `"Newton"`
- `node --import tsx --test test/public-api-registry.test.ts`
  `--test-name-pattern "Newton|newton"`
- `node --import tsx --test test/contract/json-rpc.test.ts`
  `--test-name-pattern "Newton|newton"`
- direct CLI info and help commands
- online `--persist` and offline replay with isolated `PUBLIC_APIS_HOME_DIR`
- direct endpoint probes for compute, unknown operation, and docs page
- `PUBLIC_APIS_LIVE_E2E=1 node --import tsx --test`
  `test/live-api/newton.test.ts`
- `npm run lint`
- `npm run typecheck`
- `npm run spec:validate`
- `npm run build:tarball`
- `npm run package:verify`
- `npm run quality:check` with lint, typecheck, spec validation, full test,
  and contract stages passing
- full `npm run test` within `quality:check` with 1293 passing tests
- `npm run test:contract` within `quality:check` with 194 passing tests
- `git diff --check`
- touched-file line-width scan for Newton source, tests, and report
- targeted secret scan for Newton source, tests, task row, and report

## 残余不确定（Residual Uncertainty）

Newton runs on Vercel, and no public SLA or quota is documented. The provider
now fails clearly if future WAF/challenge HTML appears, and cached/offline
replay remains available for previously persisted requests.
