# OSF Provider 审计记录（Audit Record）- Audited

- Provider: Open Science Framework
- Category: Science & Math
- Catalog URL: `https://developer.osf.io`
- Date: 2026-05-12 UTC
- Decision: audited
- Provider ID: `osf`
- Operations: `osf.nodes`, `osf.preprints`
- Research ID: `research_4ced44b5b4aa4ed98562f51a6a917c82`
- Artifact: `artifact_83a85af2c204411282563098c5f74230`

## 结论（Decision）

OSF provider 通过 command-driven runtime/TUI audit。实现继续暴露
documented no-auth HTTPS JSON:API public metadata endpoints:

- `GET https://api.osf.io/v2/nodes/`
- `GET https://api.osf.io/v2/preprints/`

CLI 只使用 curated title、category、tags、public、provider、
is-published、limit、page 和 description-length controls。Responses
are projected into bounded JSON summaries and readable text output with
storage mode, HTTPS JSON:API transport, no-auth/open REST boundary, account
boundary, pagination, record links, next commands, and replay commands.

Private records, account resources, file downloads, upload/share/delete
workflows, review actions, write methods, arbitrary route proxying, HTML
scraping, Chrome clickstream, binary payloads, and base64 payloads remain
excluded.

审计期间未观察到 Cloudflare challenge、CAPTCHA、gateway interstitial、
JavaScript redirect shell、parked-domain page、credential prompt 或
HTML-as-data。为满足 challenge regression guardrail，客户端已补充
provider-specific Cloudflare challenge HTML detection；未来 403/429
challenge HTML 会抛出明确 `OPEN_API_FAILED`，提示 retry later 或使用
cached/offline data，而不是普通 non-JSON parse failure。

## Runtime Audit

实际执行并观察：

- `node --import tsx src/cli.ts apis info osf`
- `node --import tsx src/cli.ts apis run osf.nodes --help`
- `node --import tsx src/cli.ts apis run osf.preprints --help`
- `node --import tsx src/cli.ts apis run osf.nodes --format text`
  `-- --title reproducibility --category project --limit 2`
- `node --import tsx src/cli.ts apis run osf.preprints --format text`
  `-- --provider psyarxiv --limit 2`
- `node --import tsx src/cli.ts apis run osf.nodes --format json`
  `-- --title reproducibility --tags "open science" --public true`
  `--limit 1 --description-length 120`
- `node --import tsx src/cli.ts apis run osf.nodes --format text`
  `-- --title reproducibility --category software --page 2 --limit 1`
  `--description-length 0`
- `node --import tsx src/cli.ts apis run osf.preprints --format json`
  `-- --provider psyarxiv --is-published true --limit 1 --page 2`
  `--description-length 80`
- `node --import tsx src/cli.ts apis run osf.preprints --format text`
  `-- --provider socarxiv --is-published true --limit 1`
  `--description-length 0`
- invalid probes for `--limit 51`, `--category paper`,
  `--provider ../secret`, and `--page 501`
- online `--persist` followed by offline replay with isolated
  `PUBLIC_APIS_HOME_DIR` for both operations

Representative outputs showed provider identity, endpoint, storage mode,
HTTPS JSON:API transport, open API/no-auth/no Chrome clickstream boundary,
query, counts, pagination, account boundary, scoped exclusions, record links,
next-page commands, and offline replay commands. Text output did not dump
HTML pages, warning pages, binary data, image bytes, base64 data, or raw
unbounded JSON:API payloads.

Invalid limit, category, provider slug, and page probes exited nonzero with
`INVALID_ARGUMENT` before unsafe or out-of-bound requests could be built.

## Direct Endpoint Probes

Direct probes covered:

- `GET https://api.osf.io/v2/` returned HTTP 200
  `application/vnd.api+json; charset=utf-8`, server `nginx`, and
  `current_user: null`.
- `GET https://api.osf.io/v2/nodes/?filter[title]=reproducibility`
  `&page[size]=1` returned HTTP 200 `application/vnd.api+json`.
- `GET https://api.osf.io/v2/preprints/?filter[provider]=psyarxiv`
  `&page[size]=1` returned HTTP 200 `application/vnd.api+json`.
- `GET https://api.osf.io/v2/users/me/` returned HTTP 401
  `application/vnd.api+json` with `Authentication credentials were not`
  `provided.`
- `GET https://developer.osf.io` returned HTTP 200 `text/html` official
  documentation and remains outside runtime data sources.

The exposed list routes returned normal JSON:API public metadata. The account
route returned an expected JSON auth boundary. No `cf-mitigated` challenge
header, challenge title, CAPTCHA page, JavaScript redirect shell,
parked-domain page, gateway interstitial, or HTML-as-data was observed.

## 修复（Fix）

Updated `src/infrastructure/openApis/osfClient.ts` so response bodies are read
as text before JSON parsing. The client now detects representative
Cloudflare/challenge signals:

- `cf-mitigated: challenge`
- HTTP 403/429 `text/html`
- Cloudflare server header
- `Just a moment...` challenge title

Detected challenges throw:

- code: `OPEN_API_FAILED`
- message: OSF is returning a Cloudflare challenge HTML page
- details: provider id, HTTP status, status text, content type, and URL

Updated `test/osf-client.test.ts` with a regression test that feeds
`cf-mitigated: challenge` and `Just a moment...` HTML into the client and
asserts a clear provider-specific error.

Existing non-JSON and non-OK errors now reuse shared response details and
include a short non-JSON body preview.

## 验证（Validation）

Passed:

- `node --import tsx --test test/osf-client.test.ts`
- `node --import tsx --test test/cli-output.test.ts --test-name-pattern`
  `"OSF|osf"`
- `node --import tsx --test test/public-api-registry.test.ts`
  `--test-name-pattern "OSF|osf"`
- `node --import tsx --test test/contract/json-rpc.test.ts`
  `--test-name-pattern "OSF|osf"`
- direct CLI info and help commands
- online `--persist` and offline replay with isolated `PUBLIC_APIS_HOME_DIR`
- direct endpoint probes for API root, nodes, preprints, account boundary,
  and docs page
- `PUBLIC_APIS_LIVE_E2E=1 node --import tsx --test`
  `test/live-api/osf.test.ts`
- `npm run lint`
- `npm run typecheck`
- `npm run spec:validate`
- `npm run build:tarball`
- `npm run package:verify`
- `npm run quality:check` with lint, typecheck, spec validation, full test,
  and contract stages passing
- full `npm run test` within `quality:check` with 1297 passing tests
- `npm run test:contract` within `quality:check` with 194 passing tests

## 残余不确定（Residual Uncertainty）

OSF public metadata changes continuously, so result IDs, totals, publication
dates, and ordering can vary between live runs. Provider availability remains
dependent on OSF API uptime and unauthenticated traffic policy. The provider
now fails clearly if future WAF/challenge HTML appears, and cached/offline
replay remains available for previously persisted requests.
