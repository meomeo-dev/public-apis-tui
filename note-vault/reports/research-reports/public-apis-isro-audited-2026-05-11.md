# ISRO Provider 审计记录（Audit Record）- Audited

- Provider: ISRO
- Category: Science & Math
- Catalog URL: `https://isro.vercel.app`
- Date: 2026-05-11 UTC
- Decision: audited
- Provider ID: `isro`
- Operations: `isro.catalog`
- Research ID: `research_7f8f4e19fc05442faa464f46bc2d2919`
- Artifact: `artifact_c5e486cec06d4815a5c44469bc233038`

## 结论（Decision）

ISRO provider 通过 command-driven runtime/TUI audit。实现继续暴露
documented HTTPS JSON REST endpoints：

- `GET https://isro.vercel.app/api/spacecrafts`
- `GET https://isro.vercel.app/api/launchers`
- `GET https://isro.vercel.app/api/customer_satellites`
- `GET https://isro.vercel.app/api/centres`

CLI 只使用 read-only catalog resources，并在本地执行 bounded search、
limit 和 offset。`spacecraft_missions` 仍不暴露，因为直接 probe 返回
HTTP 404 JSON provider error。Arbitrary route proxying、guessed endpoints、
browser scraping、browser clickstream、upload/delete/share workflows、
binary/base64 payloads 和 mutating operations 均不暴露。

审计期间未观察到 Cloudflare challenge、CAPTCHA、gateway interstitial、
JavaScript redirect shell、parked-domain page、credential prompt 或
HTML-as-data。为满足 challenge regression guardrail，客户端已补充
provider-specific Cloudflare challenge HTML detection；未来 403/429
challenge HTML 会抛出明确 `OPEN_API_FAILED`，提示 retry later 或使用
cached/offline data，而不是普通 non-JSON failure。

## Runtime Audit

实际执行并观察：

- `node --import tsx src/cli.ts apis info isro`
- `node --import tsx src/cli.ts apis run isro.catalog --help`
- `node --import tsx src/cli.ts apis run isro.catalog --format text --`
  `--resource spacecrafts --search Chandrayaan --limit 5`
- `node --import tsx src/cli.ts apis run isro.catalog --format json --`
  `--resource launchers --limit 5 --offset 2`
- `node --import tsx src/cli.ts apis run isro.catalog --format text --`
  `--resource customer_satellites --search Germany --limit 3`
- `node --import tsx src/cli.ts apis run isro.catalog --format text --`
  `--resource centres --search Bengaluru --limit 3`
- invalid probes for `--resource spacecraft_missions`, `--limit 101`, and
  `--offset 501`
- online `--persist` followed by offline replay with an isolated
  `PUBLIC_APIS_HOME_DIR`

Representative outputs showed provider identity, endpoint, storage mode,
HTTPS JSON REST transport, open API/no-auth/no Chrome clickstream boundary,
resource, query, pagination, scope, rows, next commands, and replay
commands. Text output did not dump full upstream arrays beyond the bounded
page, HTML pages, warning pages, binary data, image bytes, or base64 data.

Invalid probes exited nonzero with `INVALID_ARGUMENT` and clear local
validation messages before any excluded or out-of-range request.

## Direct Endpoint Probes

Direct probes covered:

- `GET https://github.com/isro/api` returned HTTP 200 `text/html`.
- `GET https://isro.vercel.app/api/spacecrafts` returned HTTP 200
  `application/json; charset=utf-8`.
- `GET https://isro.vercel.app/api/launchers` returned HTTP 200
  `application/json; charset=utf-8`.
- `GET https://isro.vercel.app/api/customer_satellites` returned HTTP 200
  `application/json; charset=utf-8`.
- `GET https://isro.vercel.app/api/centres` returned HTTP 200
  `application/json; charset=utf-8`.
- `GET https://isro.vercel.app/api/spacecraft_missions` returned HTTP 404
  `application/json` with a provider error message.

The exposed API routes returned normal JSON catalog data. No `cf-mitigated`
challenge header, Cloudflare server header, challenge title, CAPTCHA page,
JavaScript redirect shell, parked-domain page, or gateway interstitial was
observed.

## 修复（Fix）

Updated `src/infrastructure/openApis/isroClient.ts` so the client detects
representative Cloudflare/challenge signals after reading response text and
before JSON parsing:

- `cf-mitigated: challenge`
- HTTP 403/429 `text/html`
- Cloudflare server header
- `Just a moment...` challenge title

Detected challenges throw:

- code: `OPEN_API_FAILED`
- message: ISRO is returning a Cloudflare challenge HTML page
- details: provider id, HTTP status, status text, content type, and URL

Updated `test/isro-client.test.ts` with a regression test that feeds
`cf-mitigated: challenge` and `Just a moment...` HTML into the client and
asserts a clear provider-specific error.

Existing non-JSON and non-OK errors now reuse shared response details.

## 验证（Validation）

Passed:

- `node --import tsx --test test/isro-client.test.ts`
- `node --import tsx --test test/cli-output.test.ts --test-name-pattern`
  `"ISRO"`
- `node --import tsx --test test/public-api-registry.test.ts`
  `--test-name-pattern "isro|ISRO"`
- `node --import tsx --test test/contract/json-rpc.test.ts`
  `--test-name-pattern "isro|ISRO"`
- direct CLI info and help commands
- online `--persist` and offline replay with isolated `PUBLIC_APIS_HOME_DIR`
- direct endpoint probes for docs, exposed resources, and excluded mission
  route
- `PUBLIC_APIS_LIVE_E2E=1 node --import tsx --test`
  `test/live-api/isro.test.ts`
- `npm run lint`
- `npm run typecheck`
- `npm run spec:validate`
- `npm run build`
- `npm run package:verify`
- `npm run quality:check` with lint, typecheck, spec validation, full test,
  and contract stages passing
- full `npm run test` within `quality:check` with 1286 passing tests
- `npm run test:contract` within `quality:check` with 194 passing tests
- `git diff --check`
- added-line width scan for changed files
- targeted secret scan for ISRO source and tests

## 残余不确定（Residual Uncertainty）

ISRO catalog data depends on upstream availability and data freshness. The
provider now fails clearly if future WAF/challenge HTML appears, and
cached/offline replay remains available for previously persisted requests.
