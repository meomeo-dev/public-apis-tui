# Rig Veda Provider 审计记录（Audit Record）- Audited

- Provider: Rig Veda
- Category: Books
- Catalog URL: `https://aninditabasu.github.io/indica/html/rv.html`
- Date: 2026-05-12 UTC
- Decision: audited
- Provider ID: `rigveda`
- Operations: `rigveda.book`, `rigveda.search`
- Research ID: `research_cbaf5c35bd8143f79a6ce32c008d4033`
- Artifact: `artifact_fc4bbbcd04b64fc182bb9e1851ba7c22`

## 结论（Decision）

Rig Veda provider 通过 command-driven runtime/TUI audit。实现继续暴露
current same-project Indica no-auth HTTPS JSON metadata endpoints under:

- `GET https://indica-1hwj.onrender.com/rv/v2/meta/book/{mandal}`
- `GET https://indica-1hwj.onrender.com/rv/v2/meta/god/{sungfor}`
- `GET https://indica-1hwj.onrender.com/rv/v2/meta/god/{sungfor}/{mandal}`
- `GET https://indica-1hwj.onrender.com/rv/v2/meta/godbypoet/{god}/{poet}`
- `GET https://indica-1hwj.onrender.com/rv/v2/meta/godcategorybypoetcategory/`
  `{godCategory}/{poetCategory}`

CLI 只使用 curated mandal、field、value、mandal filter、poet、
poet-category、limit 和 offset controls。Responses are projected into
bounded JSON summaries and readable text output with storage mode,
HTTPS JSON transport, no-auth/open REST boundary, local pagination, facets,
next commands, and replay commands.

The listed `/indica/html/rv.html` page now returns 404 HTML and remains
outside runtime data sources. Static HTML pages, arbitrary path proxying,
guessed historical hosts, browser scraping/clickstream, account behavior,
upload/delete/share workflows, warning-as-data output, binary payloads, and
base64 payloads remain excluded.

审计期间未观察到 Cloudflare challenge、CAPTCHA、gateway interstitial、
JavaScript redirect shell、parked-domain page、credential prompt 或
HTML-as-data on exposed routes. Direct probes confirmed an invalid category
route can return HTTP 200 `text/html` warning text; CLI validation blocks that
path locally. 为满足 challenge regression guardrail，客户端已补充
provider-specific Cloudflare challenge HTML detection；未来 403/429
challenge HTML 会抛出明确 `OPEN_API_FAILED`，提示 retry later 或使用
cached/offline data，而不是普通 non-JSON failure。

## Runtime Audit

实际执行并观察：

- `node --import tsx src/cli.ts apis info rigveda`
- `node --import tsx src/cli.ts apis run rigveda.book --help`
- `node --import tsx src/cli.ts apis run rigveda.search --help`
- `node --import tsx src/cli.ts apis run rigveda.book --format text`
  `-- --mandal 4 --limit 3`
- `node --import tsx src/cli.ts apis run rigveda.search --format json`
  `-- --field god --value ganga --limit 5`
- `node --import tsx src/cli.ts apis run rigveda.search --format text`
  `-- --field poet-category --value "human male" --limit 2 --offset 1`
- `node --import tsx src/cli.ts apis run rigveda.search --format json`
  `-- --field god-in-book --value agni --mandal 1 --limit 3`
- `node --import tsx src/cli.ts apis run rigveda.search --format text`
  `-- --field god-by-poet --value agni --poet vasishth --limit 3`
- `node --import tsx src/cli.ts apis run rigveda.search --format json`
  `-- --field god-category-by-poet-category --value "divine male"`
  `--poet-category "human male" --limit 2`
- invalid probes for `--mandal 11`, `--field godcategory`,
  `--field poet --value ../secret`, `--field god-category --value gods`,
  and `--limit 101`
- online `--persist` followed by offline replay with isolated
  `PUBLIC_APIS_HOME_DIR` for both operations

Representative outputs showed provider identity, endpoint, storage mode,
HTTPS JSON transport, open API/no-auth/no Chrome clickstream boundary, query,
pagination, category policy, facets, verse metadata, next-page commands,
cross-operation navigation, and offline replay commands. Text output did not
dump HTML pages, warning pages, binary data, image bytes, base64 data, or raw
unbounded upstream arrays.

Invalid mandal, unknown field, unsafe path text, invalid category, and
out-of-range limit probes exited nonzero with `INVALID_ARGUMENT` before unsafe
or warning-producing requests could be built.

## Direct Endpoint Probes

Direct probes covered:

- `GET https://aninditabasu.github.io/indica/html/rv.html` returned
  HTTP 404 `text/html` GitHub Pages content.
- `GET https://aninditabasu.github.io/indica/topics/api_rv.html` returned
  HTTP 200 `text/html` current documentation.
- `GET https://aninditabasu.github.io/indica/assets/openapi_rv.json`
  returned HTTP 200 `application/json`.
- `GET https://indica-1hwj.onrender.com/rv/v2/meta/book/4` returned
  HTTP 200 `application/json`, server `cloudflare`.
- `GET https://indica-1hwj.onrender.com/rv/v2/meta/god/ganga` returned
  HTTP 200 `application/json`, server `cloudflare`.
- `GET https://indica-1hwj.onrender.com/rv/v2/meta/godcategory/gods`
  returned HTTP 200 `text/html` warning text and remains locally blocked.
- `GET https://indica-1hwj.onrender.com/rv/v2/meta/definitely-missing`
  returned HTTP 404 `text/html`.

The exposed routes returned normal JSON metadata. Warning and missing routes
were not treated as data. No `cf-mitigated` challenge header, challenge title,
CAPTCHA page, JavaScript redirect shell, parked-domain page, gateway
interstitial, or credential flow was observed.

## 修复（Fix）

Updated `src/infrastructure/openApis/rigVedaClient.ts` so response bodies are
checked for representative Cloudflare/challenge signals before generic
non-JSON handling:

- `cf-mitigated: challenge`
- HTTP 403/429 `text/html`
- Cloudflare server header
- `Just a moment...` challenge title

Detected challenges throw:

- code: `OPEN_API_FAILED`
- message: Rig Veda is returning a Cloudflare challenge HTML page
- details: provider id, HTTP status, status text, content type, and URL

Updated `test/rigveda-client.test.ts` with a regression test that feeds
`cf-mitigated: challenge` and `Just a moment...` HTML into the client and
asserts a clear provider-specific error. Ordinary Cloudflare-served
`application/json` responses remain accepted.

## 验证（Validation）

Passed:

- `node --import tsx --test test/rigveda-client.test.ts`
- `node --import tsx --test test/cli-output.test.ts --test-name-pattern`
  `"Rig Veda|rigveda"`
- `node --import tsx --test test/public-api-registry.test.ts`
  `--test-name-pattern "Rig Veda|rigveda"`
- `node --import tsx --test test/contract/json-rpc.test.ts`
  `--test-name-pattern "Rig Veda|rigveda"`
- direct CLI info and help commands
- online `--persist` and offline replay with isolated `PUBLIC_APIS_HOME_DIR`
- direct endpoint probes for legacy page, current docs, OpenAPI JSON, exposed
  book/search routes, invalid category warning, and missing API path
- `PUBLIC_APIS_LIVE_E2E=1 node --import tsx --test`
  `test/live-api/rigveda.test.ts`
- `npm run lint`
- `npm run typecheck`
- `npm run spec:validate`
- `npm run build:tarball`
- `npm run package:verify`
- `npm run quality:check` with lint, typecheck, spec validation, full test,
  and contract stages passing
- full `npm run test` within `quality:check` with 1298 passing tests
- `npm run test:contract` within `quality:check` with 194 passing tests

## 残余不确定（Residual Uncertainty）

Rig Veda metadata is a third-party Indica dataset and should not be treated as
canonical scripture text or scholarly authority. Provider availability remains
dependent on the Render-hosted Indica API, GitHub Pages docs, and
unauthenticated traffic policy. The provider now fails clearly if future
WAF/challenge HTML appears, and cached/offline replay remains available for
previously persisted requests.
