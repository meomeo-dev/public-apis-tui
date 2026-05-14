# Minor Planet Center Provider 审计记录（Audit Record）- Audited

- Provider: Minor Planet Center
- Category: Science & Math
- Catalog URL: `http://www.asterank.com/mpc`
- Date: 2026-05-12 UTC
- Decision: audited
- Provider ID: `minorplanetcenter`
- Operation: `minorplanetcenter.search`
- Research ID: `research_e11927129ce44db58bab24883610d185`
- Artifact: `artifact_ef29f89d586d4a0fb63c3cd7de0056bf`

## 结论（Decision）

Minor Planet Center provider 通过 command-driven runtime/TUI audit。实现继续
暴露 documented Asterank HTTPS JSON endpoint：

- `GET https://www.asterank.com/api/mpc`

CLI 只使用 curated designation text、numeric orbit filters、minimum
observation count 和 bounded limit controls。Arbitrary MongoDB query
passthrough、static HTML pages、browser scraping、browser clickstream、
bulk MPCORB download、image/binary payloads、upload/delete/share workflows、
mutating operations、warning-as-data、account behavior 和 API-key paths
均不暴露。

审计期间未观察到 Cloudflare challenge、CAPTCHA、gateway interstitial、
JavaScript redirect shell、parked-domain page、credential prompt 或
HTML-as-data。为满足 challenge regression guardrail，客户端已补充
provider-specific Cloudflare challenge HTML detection；未来 403/429
challenge HTML 会抛出明确 `OPEN_API_FAILED`，提示 retry later 或使用
cached/offline data，而不是普通 JSON parse failure。

## Runtime Audit

实际执行并观察：

- `node --import tsx src/cli.ts apis info minorplanetcenter`
- `node --import tsx src/cli.ts apis run minorplanetcenter.search --help`
- `node --import tsx src/cli.ts apis run minorplanetcenter.search`
  `--format text -- --query Ceres --limit 3`
- `node --import tsx src/cli.ts apis run minorplanetcenter.search`
  `--format json -- --query Ceres --limit 2`
- `node --import tsx src/cli.ts apis run minorplanetcenter.search`
  `--format text -- --query "" --max-eccentricity 0.1`
  `--max-inclination 5 --max-semi-major-axis 2`
  `--min-observations 100 --limit 3`
- `node --import tsx src/cli.ts apis run minorplanetcenter.search`
  `--format json -- --query Vesta --limit 2 --max-inclination 20`
- empty result probe for `--query zzzzunlikelyasteroid --limit 3`
- invalid probes for `--limit 51`, `--max-inclination 181`, and
  `--min-observations 1.5`
- online `--persist` followed by offline replay with an isolated
  `PUBLIC_APIS_HOME_DIR`

Representative outputs showed provider identity, endpoint, storage mode,
HTTPS JSON transport, open API/no-auth/no Chrome clickstream boundary,
query, filters, asteroid rows, next commands, and replay commands. Text
output did not dump HTML pages, warning pages, binary data, image bytes, or
base64 data.

Invalid probes exited nonzero with `INVALID_ARGUMENT` and clear local
validation messages before any out-of-range request.

## Direct Endpoint Probes

Direct probes covered:

- `GET https://www.asterank.com/mpc` returned HTTP 200 `text/html` as the
  documentation page.
- `GET https://www.asterank.com/api/mpc?limit=1` returned HTTP 200
  `application/json`.
- A Ceres filtered API query returned HTTP 200 `application/json`.
- An unlikely designation query returned HTTP 200 `application/json` with
  an empty array.
- A malformed query returned HTTP 500 `application/json` with a provider
  `bad request` error payload.

The exposed API route returned normal asteroid JSON. No `cf-mitigated`
challenge header, challenge title, CAPTCHA page, JavaScript redirect shell,
parked-domain page, or gateway interstitial was observed. Server headers
identified Cloudflare infrastructure without challenge mitigation.

## 修复（Fix）

Updated `src/infrastructure/openApis/minorPlanetCenterClient.ts` so response
bodies are read as text before JSON parsing. The client now detects
representative Cloudflare/challenge signals:

- `cf-mitigated: challenge`
- HTTP 403/429 `text/html`
- Cloudflare server header
- `Just a moment...` challenge title

Detected challenges throw:

- code: `OPEN_API_FAILED`
- message: Asterank MPC is returning a Cloudflare challenge HTML page
- details: provider id, HTTP status, status text, content type, and URL

Updated `test/minor-planet-center-client.test.ts` with a regression test that
feeds `cf-mitigated: challenge` and `Just a moment...` HTML into the client
and asserts a clear provider-specific error.

Existing non-JSON and non-OK errors now reuse shared response details.

## 验证（Validation）

Passed:

- `node --import tsx --test test/minor-planet-center-client.test.ts`
- `node --import tsx --test test/cli-output.test.ts --test-name-pattern`
  `"Minor Planet Center"`
- `node --import tsx --test test/public-api-registry.test.ts`
  `--test-name-pattern "Minor Planet Center|minorplanetcenter"`
- `node --import tsx --test test/contract/json-rpc.test.ts`
  `--test-name-pattern "Minor Planet Center"`
- direct CLI info and help commands
- online `--persist` and offline replay with isolated `PUBLIC_APIS_HOME_DIR`
- direct endpoint probes for docs, API data, empty state, and error payloads
- `PUBLIC_APIS_LIVE_E2E=1 node --import tsx --test`
  `test/live-api/minor-planet-center.test.ts`
- `npm run lint`
- `npm run typecheck`
- `npm run spec:validate`
- `npm run build:tarball`
- `npm run package:verify`
- `npm run quality:check` with lint, typecheck, spec validation, full test,
  and contract stages passing
- full `npm run test` within `quality:check` with 1291 passing tests
- `npm run test:contract` within `quality:check` with 194 passing tests
- `git diff --check`
- touched-file line-width scan for Minor Planet Center source, tests, and
  report
- targeted secret scan for Minor Planet Center source, tests, task row, and
  report

## 残余不确定（Residual Uncertainty）

Asterank serves the API behind Cloudflare and does not document a public SLA
or quota. The provider now fails clearly if future WAF/challenge HTML
appears, and cached/offline replay remains available for previously
persisted requests.
