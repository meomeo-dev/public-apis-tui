# isEven Provider 审计记录（Audit Record）- Audited

- Provider: isEven
- Category: Science & Math
- Catalog URL: `https://isevenapi.xyz/`
- Date: 2026-05-11 UTC
- Decision: audited
- Provider ID: `iseven`
- Operations: `iseven.check`
- Research ID: `research_c3dada49e3a545048945822543bb7ae2`
- Artifact: `artifact_911be6c36363461091d7b74bca01e309`

## 结论（Decision）

isEven provider 通过 command-driven runtime/TUI audit。实现继续暴露
documented HTTPS JSON REST endpoint：

- `GET https://api.isevenapi.xyz/api/iseven/{number}/`

CLI 只使用 read-only JSON parity check operation。输入被限制在
documented Public free range `0..999999`，并拒绝 negative numbers 和
paid-tier ranges。Premium/Enterprise ranges、account features、HTML
scraping、browser clickstream、arbitrary code execution、upload/delete/share
workflows、binary/base64 payloads 和 local parity substitution 均不暴露。

审计期间未观察到 Cloudflare challenge、CAPTCHA、gateway interstitial、
JavaScript redirect shell、parked-domain page、credential prompt 或
HTML-as-data。为满足 challenge regression guardrail，客户端已补充
provider-specific Cloudflare challenge HTML detection；未来 403/429
challenge HTML 会抛出明确 `OPEN_API_FAILED`，提示 retry later 或使用
cached/offline data，而不是普通 JSON parse failure。

## Runtime Audit

实际执行并观察：

- `node --import tsx src/cli.ts apis info iseven`
- `node --import tsx src/cli.ts apis run iseven.check --help`
- `node --import tsx src/cli.ts apis run iseven.check --format text --`
  `--number 0`
- `node --import tsx src/cli.ts apis run iseven.check --format json --`
  `--number 999999`
- invalid probes for `--number -1` and `--number 1000000`
- online `--persist` followed by offline replay with an isolated
  `PUBLIC_APIS_HOME_DIR`

Representative outputs showed provider identity, endpoint, storage mode,
HTTPS JSON REST transport, open API/no-auth/no Chrome clickstream boundary,
query, public free range, tier policy, ad policy, parity result, provider ad
metadata, and next commands. Text output did not dump HTML pages, warning
pages, binary data, image bytes, or base64 data.

Invalid probes exited nonzero with `INVALID_ARGUMENT` and a clear
`0..999999` range message before any paid-tier or out-of-range request.

## Direct Endpoint Probes

Direct probes covered:

- `GET https://isevenapi.xyz/` returned HTTP 200 `text/html` with title
  `isEven API - Tell if a number is even`.
- `GET https://api.isevenapi.xyz/api/iseven/6/` returned HTTP 200
  `application/json`.
- `GET https://api.isevenapi.xyz/api/iseven/0/` returned HTTP 200
  `application/json`.
- `GET https://api.isevenapi.xyz/api/iseven/999999/` returned HTTP 200
  `application/json`.

The exposed API routes returned normal JSON with provider ad text and
`iseven` boolean values. No `cf-mitigated` challenge header, Cloudflare
server header, challenge title, CAPTCHA page, JavaScript redirect shell,
parked-domain page, or gateway interstitial was observed.

## 修复（Fix）

Updated `src/infrastructure/openApis/isEvenClient.ts` so response bodies are
read as text before JSON parsing. The client now detects representative
Cloudflare/challenge signals:

- `cf-mitigated: challenge`
- HTTP 403/429 `text/html`
- Cloudflare server header
- `Just a moment...` challenge title

Detected challenges throw:

- code: `OPEN_API_FAILED`
- message: isEven is returning a Cloudflare challenge HTML page
- details: provider id, HTTP status, status text, content type, and URL

Updated `test/iseven-client.test.ts` with a regression test that feeds
`cf-mitigated: challenge` and `Just a moment...` HTML into the client and
asserts a clear provider-specific error.

Non-OK JSON errors now include parsed response details, and nested provider
`error` fields are handled.

## 验证（Validation）

Passed:

- `node --import tsx --test test/iseven-client.test.ts`
- `node --import tsx --test test/cli-output.test.ts --test-name-pattern`
  `"isEven"`
- `node --import tsx --test test/public-api-registry.test.ts`
  `--test-name-pattern "iseven|isEven"`
- `node --import tsx --test test/contract/json-rpc.test.ts`
  `--test-name-pattern "iseven|isEven"`
- direct CLI info and help commands
- online `--persist` and offline replay with isolated `PUBLIC_APIS_HOME_DIR`
- direct endpoint probes for docs, default API route, and boundary values
- `PUBLIC_APIS_LIVE_E2E=1 node --import tsx --test`
  `test/live-api/iseven.test.ts`
- `npm run lint`
- `npm run typecheck`
- `npm run spec:validate`
- `npm run build`
- `npm run package:verify`
- `npm run quality:check` with lint, typecheck, spec validation, full test,
  and contract stages passing
- full `npm run test` within `quality:check` with 1285 passing tests
- `npm run test:contract` within `quality:check` with 194 passing tests
- `git diff --check`
- added-line width scan for changed files
- targeted secret scan for isEven source and tests

## 残余不确定（Residual Uncertainty）

isEven responses include rotating provider ad metadata. That content is
labeled as upstream ad metadata and is not used as a decision field. The
provider now fails clearly if future WAF/challenge HTML appears, and
cached/offline replay remains available for previously persisted requests.
