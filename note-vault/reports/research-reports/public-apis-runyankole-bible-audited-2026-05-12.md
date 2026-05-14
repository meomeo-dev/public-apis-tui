# Runyankole Bible Provider 审计记录（Audit Record）- Audited

- Provider: Runyankole Bible
- Category: Books
- Catalog URL: `https://runyankole-bible-api.vercel.app`
- Date: 2026-05-12 UTC
- Decision: audited
- Provider ID: `runyankolebible`
- Operations: `runyankolebible.books`, `runyankolebible.verse`,
  `runyankolebible.chapter`, `runyankolebible.search`,
  `runyankolebible.random`
- Research ID: `research_3d6c7e6cb9274bee892c0aa6bc536ab7`
- Artifact: `artifact_899493408d64427ba1de80dd0f5a410d`

## 结论（Decision）

Runyankole Bible provider 通过 command-driven runtime/TUI audit。实现继续暴露
same-origin no-auth HTTPS JSON endpoints:

- `GET https://runyankole-bible-api.vercel.app/api/books`
- `GET https://runyankole-bible-api.vercel.app/api/verse`
- `GET https://runyankole-bible-api.vercel.app/api/chapter`
- `GET https://runyankole-bible-api.vercel.app/api/search`
- `GET https://runyankole-bible-api.vercel.app/api/random`

CLI 只使用 curated book、chapter、verse、search query、optional random book、
limit 和 offset controls。Responses are projected into bounded JSON summaries
and readable text output with storage mode, HTTPS JSON REST transport,
no-auth/open REST boundary, translation, attribution, pagination, empty state,
next commands, and replay commands.

Homepage HTML as data, undocumented route proxying, browser scraping or
clickstream, account behavior, bulk text download workflows,
upload/delete/share workflows, binary payloads, and base64 payloads remain
excluded.

审计期间未观察到 Cloudflare challenge、CAPTCHA、gateway interstitial、
JavaScript redirect shell、parked-domain page、credential prompt 或
HTML-as-data on exposed routes. 为满足 challenge regression guardrail，客户端
已补充 provider-specific Cloudflare challenge HTML detection；未来 403/429
challenge HTML 会抛出明确 `OPEN_API_FAILED`，提示 retry later 或使用
cached/offline data，而不是普通 non-JSON failure。

## Runtime Audit

实际执行并观察：

- `npx tsx src/cli.ts apis info runyankolebible`
- `npx tsx src/cli.ts apis run runyankolebible.books --help`
- `npx tsx src/cli.ts apis run runyankolebible.verse --help`
- `npx tsx src/cli.ts apis run runyankolebible.chapter --help`
- `npx tsx src/cli.ts apis run runyankolebible.search --help`
- `npx tsx src/cli.ts apis run runyankolebible.random --help`
- `npx tsx src/cli.ts apis run runyankolebible.books --format text`
  `-- --limit 3`
- `npx tsx src/cli.ts apis run runyankolebible.verse --format json`
  `-- --book 10 --chapter 1 --verse 1`
- `npx tsx src/cli.ts apis run runyankolebible.chapter --format text`
  `-- --book 10 --chapter 1 --limit 3`
- `npx tsx src/cli.ts apis run runyankolebible.search --format json`
  `-- --query Ruhanga --limit 2 --offset 1`
- `npx tsx src/cli.ts apis run runyankolebible.random --format text`
  `-- --book 10`
- empty search probe for `--query zznotfoundzz --limit 2`
- invalid probes for `--limit 0`, `--book 9`, `--chapter 0`,
  `--query ../secret`, and `--book 731`
- online `--persist` followed by offline replay with isolated
  `PUBLIC_APIS_HOME_DIR` for search

Representative outputs showed provider identity, endpoint, storage mode,
HTTPS JSON REST transport, open API/no-auth/no Chrome clickstream boundary,
translation, attribution, query, pagination, chapter context, empty-state
remediation, next-page commands, cross-operation navigation, and offline replay
commands. Text output did not dump HTML pages, gateway pages, warning pages,
binary data, base64 data, or raw unbounded upstream payloads.

Invalid limit, book, chapter, unsafe query, and out-of-range random book probes
exited nonzero with `INVALID_ARGUMENT` before unsafe requests could be built.

## Direct Endpoint Probes

Direct probes covered:

- `GET https://runyankole-bible-api.vercel.app/` returned HTTP 200
  `text/html; charset=utf-8`, server `Vercel`; this is documentation and
  remains outside runtime data sources.
- `GET https://runyankole-bible-api.vercel.app/api/books` returned HTTP 200
  `application/json; charset=utf-8`, server `Vercel`.
- `GET https://runyankole-bible-api.vercel.app/api/verse?book=10&chapter=1`
  `&verse=1` returned HTTP 200 `application/json; charset=utf-8`.
- `GET https://runyankole-bible-api.vercel.app/api/chapter?book=10&chapter=1`
  returned HTTP 200 `application/json; charset=utf-8`.
- `GET https://runyankole-bible-api.vercel.app/api/search?q=Ruhanga&limit=2`
  `&offset=1` returned HTTP 200 `application/json; charset=utf-8`.
- `GET https://runyankole-bible-api.vercel.app/api/random?book=10` returned
  HTTP 200 `application/json; charset=utf-8`.
- `GET https://runyankole-bible-api.vercel.app/api/unknown` returned HTTP 404
  `application/json` error envelope.
- `GET https://runyankole-bible-api.vercel.app/api/search?q=../secret`
  returned HTTP 200 JSON empty results upstream, while the CLI blocks unsafe
  query text locally.

The exposed routes returned normal JSON. Unknown API route returned JSON 404
and was not treated as data. No `cf-mitigated` challenge header, challenge
title, CAPTCHA page, JavaScript redirect shell, parked-domain page, gateway
interstitial, credential flow, binary payload, or base64 payload was observed.

## 修复（Fix）

Updated `src/infrastructure/openApis/runyankoleBibleClient.ts` so response
bodies are checked for representative Cloudflare/challenge signals before
generic non-JSON handling:

- `cf-mitigated: challenge`
- HTTP 403/429 `text/html`
- Cloudflare server header
- `Just a moment...` challenge title

Detected challenges throw:

- code: `OPEN_API_FAILED`
- message: Runyankole Bible is returning a Cloudflare challenge HTML page
- details: provider id, HTTP status, status text, content type, and URL

Updated `test/runyankolebible-client.test.ts` with a regression test that
feeds `cf-mitigated: challenge` and `Just a moment...` HTML into the client and
asserts a clear provider-specific error.

## 验证（Validation）

Passed:

- `node --import tsx --test test/runyankolebible-client.test.ts`
- `node --import tsx --test test/cli-output.test.ts --test-name-pattern`
  `"Runyankole Bible"`
- `node --import tsx --test test/public-api-registry.test.ts`
  `--test-name-pattern "Runyankole Bible|runyankolebible"`
- `node --import tsx --test test/endpoint-catalog.test.ts`
  `--test-name-pattern "Runyankole|runyankole"`
- `node --import tsx --test test/contract/json-rpc.test.ts`
  `--test-name-pattern "Runyankole Bible|runyankolebible"`
- direct CLI info and help commands
- online `--persist` and offline replay with isolated `PUBLIC_APIS_HOME_DIR`
- direct endpoint probes for homepage docs, exposed API routes, unknown route,
  and unsafe-search boundary
- `PUBLIC_APIS_LIVE_E2E=1 node --import tsx --test`
  `test/live-api/runyankolebible.test.ts`
- `npm run lint`
- `npm run typecheck`
- `npm run spec:validate`
- `npm run build:tarball`
- `npm run package:verify`
- `npm run quality:check` with lint, typecheck, spec validation, full test,
  and contract stages passing
- full `npm run test` within `quality:check` with 1299 passing tests
- `npm run test:contract` within `quality:check` with 194 passing tests

## 残余不确定（Residual Uncertainty）

Runyankole Bible data is a third-party public Bible API and should not be
treated as canonical textual authority beyond the provider's documented
translation attribution. Provider availability remains dependent on the
Vercel-hosted API and unauthenticated traffic policy. The provider now fails
clearly if future WAF/challenge HTML appears, and cached/offline replay remains
available for previously persisted requests.
