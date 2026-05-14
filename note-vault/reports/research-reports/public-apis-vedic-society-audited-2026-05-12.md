# Vedic Society Provider 审计记录（Audit Record）- Audited

- Provider: Vedic Society
- Category: Books
- Catalog URL: `https://aninditabasu.github.io/indica/html/vs.html`
- Date: 2026-05-12 UTC
- Decision: audited
- Provider ID: `vedicsociety`
- Operations: `vedicsociety.words`, `vedicsociety.descriptions`,
  `vedicsociety.category`
- Research ID: `research_85a670e5d3e24be580ed74328c27356b`
- Artifact: `artifact_0ff5e66e746b4d3ab98a29afd29dddd4`

## 结论（Decision）

Vedic Society provider 通过 command-driven runtime/TUI audit。实现继续暴露
no-auth HTTPS JSON REST endpoints:

- `GET https://indica-1hwj.onrender.com/vs/v2/words/{word}`
- `GET https://indica-1hwj.onrender.com/vs/v2/descriptions/{description}`
- `GET https://indica-1hwj.onrender.com/vs/v2/categories/{category}`

CLI 只使用 curated word、description、documented category、limit 与 offset
controls。输出保持 bounded noun records、Nagari spellings、descriptions、
categories、facets、pagination、storage mode 与 open-API boundary projection。

Legacy listed HTML page、static docs HTML、API root HTML、warning text、arbitrary
route proxying、browser scraping/clickstream、upload/delete/share workflows、
binary payloads、base64 payloads 与 raw upstream dumps remain excluded.

## Runtime Audit

实际执行并观察：

- `npx tsx src/cli.ts apis info vedicsociety`
- `npx tsx src/cli.ts apis run vedicsociety.words --help`
- `npx tsx src/cli.ts apis run vedicsociety.descriptions --help`
- `npx tsx src/cli.ts apis run vedicsociety.category --help`
- `npx tsx src/cli.ts apis run vedicsociety.words --format text`
  `-- --word agni --limit 3`
- `npx tsx src/cli.ts apis run vedicsociety.descriptions --format json`
  `-- --description fire --limit 3`
- `npx tsx src/cli.ts apis run vedicsociety.category --format text`
  `-- --category river --limit 4`
- empty-state word probe with `--word zzzznotfound`
- invalid probes for word `../secret`, limit `101`, category `geography`,
  and offset `-1`
- online `--persist` followed by offline replay with isolated
  `PUBLIC_APIS_HOME_DIR`

Representative outputs showed provider identity, endpoint, storage mode,
HTTPS JSON REST transport, no-auth/open REST boundary, no Chrome clickstream
boundary, query, pagination, facets, empty-state remediation, again/replay
commands, and related next commands. Text output did not dump HTML docs,
warning text, raw arrays, binary data, or base64 data.

Invalid word, category, limit, and offset probes exited nonzero with
`INVALID_ARGUMENT` before unsafe requests were built.

## Direct Endpoint Probes

Direct probes covered:

- legacy listed page; returned HTTP 404 `text/html` GitHub Pages response.
- current docs page; returned HTTP 200 `text/html`.
- OpenAPI JSON; returned HTTP 200 `application/json`.
- API root; returned HTTP 200 `text/html` docs shell outside CLI projection.
- words route; returned HTTP 200 `application/json`.
- descriptions route; returned HTTP 200 `application/json`.
- category route; returned HTTP 200 `application/json`.
- empty word route; returned HTTP 200 `text/html` not-found text mapped to
  empty results.
- invalid category route; returned HTTP 200 `text/html` warning text outside
  operation data.
- missing route; returned HTTP 404 `text/html` outside operation data.

Runtime API routes used `server: cloudflare`, but no
`cf-mitigated: challenge`, challenge title, CAPTCHA page, JavaScript redirect
shell, parked-domain page, gateway interstitial, credential flow, browser
clickstream, binary runtime payload, or base64 runtime payload was observed.

## 修复（Fix）

Updated `src/infrastructure/openApis/vedicSocietyClient.ts` so response bodies
are read as text, checked for representative challenge signals, then parsed as
JSON:

- HTTP 403/429 `text/html`
- `cf-mitigated: challenge`
- Cloudflare server header
- `Just a moment...` challenge title
- CAPTCHA, access-denied, and attention-required HTML markers

Detected challenges throw:

- code: `OPEN_API_FAILED`
- message: Vedic Society is returning a Cloudflare challenge HTML page
- details: provider id, HTTP status, status text, content type, and URL

Updated `test/vedicsociety-client.test.ts` with regression coverage for
challenge HTML.

## 验证（Validation）

Passed:

- `node --import tsx --test test/vedicsociety-client.test.ts`
- `node --import tsx --test test/cli-output.test.ts --test-name-pattern`
  `"Vedic Society|vedicsociety"`
- `node --import tsx --test test/public-api-registry.test.ts`
  `--test-name-pattern "Vedic Society|vedicsociety"`
- `node --import tsx --test test/endpoint-catalog.test.ts`
  `--test-name-pattern "Vedic Society|vedicsociety"`
- `node --import tsx --test test/contract/json-rpc.test.ts`
  `--test-name-pattern "Vedic Society|vedicsociety"`
- direct CLI info/help, runtime text/JSON, invalid-argument, empty-state,
  endpoint, warning-text, and challenge-boundary probes
- online `--persist` and offline replay with isolated `PUBLIC_APIS_HOME_DIR`
- `PUBLIC_APIS_LIVE_E2E=1 node --import tsx --test`
  `test/live-api/vedicsociety.test.ts`
- `npm run lint`
- `npm run typecheck`
- `npm run spec:validate`
- `npm run build:tarball`
- `npm run package:verify`
- `npm run quality:check` with lint, typecheck, spec validation, full test,
  and contract stages passing
- full test stage within `quality:check` with 1308 passing unit tests
- contract stage within `quality:check` with 194 passing contract tests

## 残余不确定（Residual Uncertainty）

No public quota, rate limit, or SLA is documented for the selected endpoints.
The runtime host currently sits behind Cloudflare; this audit observed normal
JSON responses for exposed routes, but the provider now fails clearly if
future challenge HTML appears. Cached/offline replay remains available for
previously persisted requests.

## 参考（References）

- `evidence_4d50773e28bd45c0bddc19207dd5a519`
- `evidence_8574142b93714731a29a38ae69647125`
- `evidence_51166bb03ad24fe7b16b1186b3c18085`
- `evidence_4ac7a2e9cb3444d087e1041a68ce3722`
