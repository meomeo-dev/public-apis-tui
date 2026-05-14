# SHARE Provider 审计记录（Audit Record）- Audited

- Provider: SHARE
- Category: Science & Math
- Catalog URL: `https://share.osf.io/api/v2/`
- Date: 2026-05-12 UTC
- Decision: audited
- Provider ID: `share`
- Operations: `share.search`, `share.sources`
- Research ID: `research_f6e996b621d94461ae76e981ae0ed46a`
- Artifact: `artifact_2619e5ee74bd4d8197c694d830eb9932`

## 结论（Decision）

SHARE provider 通过 command-driven runtime/TUI audit。实现继续暴露
no-auth HTTPS JSON metadata endpoints:

- `POST https://share.osf.io/api/v2/search/creativeworks/_search`
- `GET https://share.osf.io/api/v2/sources/`

CLI 只使用 curated search text、work type、source、sort、limit、offset、
source-query 和 description-length controls。Search builds a bounded
`simple_query_string` request body over documented indexed fields plus exact
filters. Sources sends a JSON:API `Accept` header and applies local filtering
and pagination over the returned source page.

Raw Elasticsearch DSL, aggregations, SHARE Discover browser-generated query
bodies, source creation/push/update/curation workflows, account-scoped user
behavior, RSS/Atom bulk feed dumping, arbitrary route proxying, HTML scraping,
Chrome clickstream, binary downloads, and base64 payloads remain excluded.

审计期间未观察到 Cloudflare challenge、CAPTCHA、gateway interstitial、
JavaScript redirect shell、parked-domain page、credential prompt 或 exposed
route HTML-as-data。Direct probes confirmed SHARE serves browser HTML for some
GET routes when `Accept` prefers HTML; CLI requests use JSON:API `Accept` and
receive JSON. 为满足 challenge regression guardrail，客户端已补充
provider-specific Cloudflare challenge HTML detection；未来 403/429 challenge
HTML 会抛出明确 `OPEN_API_FAILED`，提示 retry later 或使用 cached/offline
data，而不是普通 non-JSON failure。

## Runtime Audit

实际执行并观察：

- `npx tsx src/cli.ts apis info share`
- `npx tsx src/cli.ts apis run share.search --help`
- `npx tsx src/cli.ts apis run share.sources --help`
- `npx tsx src/cli.ts apis run share.search --format text`
  `-- --query reproducibility --type preprint --source OSF --limit 2`
- `npx tsx src/cli.ts apis run share.sources --format json -- --limit 2`
- `npx tsx src/cli.ts apis run share.search --format json`
  `-- --query reproducibility --sort date --limit 1 --description-length 0`
- `npx tsx src/cli.ts apis run share.sources --format text`
  `-- --query OSF --limit 2`
- `npx tsx src/cli.ts apis run share.search --format text`
  `-- --query zznotfoundzz --limit 2`
- invalid probes for raw JSON DSL query, invalid type, invalid source token,
  invalid limit, invalid offset, invalid description length, and invalid sort
- online `--persist` followed by offline replay with isolated
  `PUBLIC_APIS_HOME_DIR` for both operations

Representative outputs showed provider identity, endpoint, storage mode,
HTTPS JSON REST transport, open API/no-auth/no Chrome clickstream boundary,
curated query policy, scope exclusions, search timing, pagination, work links,
contributors, sources, tags, subjects, empty-state remediation, next-page
commands, cross-operation navigation, and offline replay commands.

Invalid query DSL punctuation, unsupported type, unsafe source, out-of-range
limit/offset/description length, and invalid sort probes exited nonzero with
`INVALID_ARGUMENT` before unsafe or raw-DSL requests could be built.

## Direct Endpoint Probes

Direct probes covered:

- `POST https://share.osf.io/api/v2/search/creativeworks/_search` with the
  CLI-shaped body returned HTTP 200 `application/json`.
- The same POST route with raw `match_all` also returned HTTP 200 JSON
  upstream, confirming why CLI must not expose raw DSL.
- `GET https://share.osf.io/api/v2/` with JSON:API `Accept` returned HTTP 200
  `application/vnd.api+json`.
- `GET https://share.osf.io/api/v2/sources/` with JSON:API `Accept` returned
  HTTP 200 `application/vnd.api+json`.
- `GET https://share.osf.io/api/v2/sources/` with `Accept: application/json`
  returned HTTP 406 JSON:API error.
- `GET https://share.osf.io/api/v2/sources/` with `Accept: text/html` returned
  HTTP 200 browser HTML and remains outside runtime data sources.
- `GET https://share-api-and-curation.readthedocs.io/` returned HTTP 200
  `text/html` documentation and remains outside runtime data sources.
- `GET https://share.osf.io/api/v2/users/me/` and a missing API path returned
  HTML/error pages and remain excluded.

The exposed CLI routes returned normal JSON when called with the client
headers. No `cf-mitigated` challenge header, challenge title, CAPTCHA page,
JavaScript redirect shell, parked-domain page, gateway interstitial,
credential flow, binary payload, or base64 payload was observed.

## 修复（Fix）

Updated `src/infrastructure/openApis/shareClient.ts` so response bodies are
read as text, checked for representative Cloudflare/challenge signals, then
parsed as JSON:

- `cf-mitigated: challenge`
- HTTP 403/429 `text/html`
- Cloudflare server header
- `Just a moment...` challenge title

Detected challenges throw:

- code: `OPEN_API_FAILED`
- message: SHARE is returning a Cloudflare challenge HTML page
- details: provider id, HTTP status, status text, content type, and URL

Updated `test/share-client.test.ts` with a regression test that feeds
`cf-mitigated: challenge` and `Just a moment...` HTML into the client and
asserts a clear provider-specific error.

## 验证（Validation）

Passed:

- `node --import tsx --test test/share-client.test.ts`
- `node --import tsx --test test/cli-output.test.ts --test-name-pattern`
  `"SHARE|share"`
- `node --import tsx --test test/public-api-registry.test.ts`
  `--test-name-pattern "SHARE|share"`
- `node --import tsx --test test/endpoint-catalog.test.ts`
  `--test-name-pattern "SHARE|share"`
- `node --import tsx --test test/contract/json-rpc.test.ts`
  `--test-name-pattern "SHARE|share"`
- direct CLI info and help commands
- online `--persist` and offline replay with isolated `PUBLIC_APIS_HOME_DIR`
- direct endpoint probes for search, API root, sources content negotiation,
  docs, user boundary, missing route, and raw-DSL upstream boundary
- `PUBLIC_APIS_LIVE_E2E=1 node --import tsx --test`
  `test/live-api/share.test.ts`
- `npm run lint`
- `npm run typecheck`
- `npm run spec:validate`
- `npm run build:tarball`
- `npm run package:verify`
- `npm run quality:check` with lint, typecheck, spec validation, full test,
  and contract stages passing
- full `npm run test` within `quality:check` with 1300 passing tests
- `npm run test:contract` within `quality:check` with 194 passing tests

## 残余不确定（Residual Uncertainty）

SHARE metadata changes continuously, so search totals, scores, ordering,
source pages, and individual records can vary between live runs. Provider
availability remains dependent on SHARE/OSF infrastructure and unauthenticated
traffic policy. The provider now fails clearly if future WAF/challenge HTML
appears, and cached/offline replay remains available for previously persisted
requests.
