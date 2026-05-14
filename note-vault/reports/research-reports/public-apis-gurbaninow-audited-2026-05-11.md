# GurbaniNow Provider 审计记录（Audit Record）- Audited

- Provider: GurbaniNow
- Category: Books
- Catalog URL: `https://github.com/gurbaninow/api-public`
- Date: 2026-05-11 UTC
- Decision: audited
- Provider ID: `gurbaninow`
- Operations: `gurbaninow.search`, `gurbaninow.banis`, `gurbaninow.bani`
- Research ID: `research_8c66069f1aea440ba712fbdca05fae7a`
- Artifact: `artifact_a88aeba510794523a1b584af2a85e468`

## 结论（Decision）

GurbaniNow provider 通过 command-driven runtime/TUI audit。实现继续暴露
documented HTTPS JSON REST endpoints：

- `GET https://api.gurbaninow.com/v2/search/{query}`
- `GET https://api.gurbaninow.com/v2/banis`
- `GET https://api.gurbaninow.com/v2/banis/{id}`

CLI 只使用 read-only GET JSON operations。Deprecated converter、random
redirect、hukamnama today/archive、browser scraping、browser clickstream、
mutating behavior、upload/delete/share workflow、binary payload、image
download 和 base64 payload 均不暴露。

审计期间未观察到 Cloudflare challenge、CAPTCHA、gateway interstitial、
JavaScript redirect shell、parked-domain page、credential prompt 或
HTML-as-data。为满足 challenge regression guardrail，客户端已补充
provider-specific Cloudflare challenge HTML detection；未来 403/429
challenge HTML 会抛出明确 `OPEN_API_FAILED`，提示 retry later 或使用
cached/offline data，而不是普通 JSON parse failure。

审计还发现旧仓库路径 `https://github.com/GurbaniNow/api` 当前返回 404。
Provider metadata 已改为当前可验证的 archived official repository：
`https://github.com/gurbaninow/api-public`，并指向其 wiki API
documentation。

## Runtime Audit

实际执行并观察：

- `npx tsx src/cli.ts apis info gurbaninow --format text`
- `npx tsx src/cli.ts apis info gurbaninow --format json`
- `npx tsx src/cli.ts apis run gurbaninow.search --help`
- `npx tsx src/cli.ts apis run gurbaninow.banis --help`
- `npx tsx src/cli.ts apis run gurbaninow.bani --help`
- `npx tsx src/cli.ts apis run gurbaninow.search --format text --`
  `--query DDrgj --source 1 --search-type 1 --writer 35 --raag 22`
  `--ang 968 --results 2 --skip 0`
- `npx tsx src/cli.ts apis run gurbaninow.search --format json --`
  `--query DDrgj --source 1 --search-type 1 --writer 35 --raag 22`
  `--ang 968 --results 2 --skip 0`
- `npx tsx src/cli.ts apis run gurbaninow.banis --format text --`
  `--limit 2`
- `npx tsx src/cli.ts apis run gurbaninow.banis --format json --`
  `--limit 2`
- `npx tsx src/cli.ts apis run gurbaninow.bani --format text --`
  `--id 1 --offset 2 --limit 2`
- `npx tsx src/cli.ts apis run gurbaninow.bani --format json --`
  `--id 1 --offset 2 --limit 2`
- invalid probes for `--search-type 3`, `--results 51`,
  `--skip 10001`, `--id 0`, and `--limit 121`
- online `--persist` followed by offline replay for all three operations
  with an isolated `PUBLIC_APIS_HOME_DIR`

Representative outputs showed provider identity, endpoint, storage mode,
HTTPS JSON REST transport, open API/no-auth/no Chrome clickstream boundary,
query, pagination, source, writer, raag, Bani metadata, Gurbani lines,
translation, transliteration, count, and next commands. Text output did not
dump raw full payloads, HTML pages, warning pages, binary data, image bytes,
or base64 data.

## Direct Endpoint Probes

Direct probes covered:

- `GET https://api.gurbaninow.com/v2/search/DDrgj/?source=1`
  `&searchtype=1&results=2` returned HTTP 200 `application/json`.
- `GET https://api.gurbaninow.com/v2/banis` returned HTTP 200
  `application/json`.
- `GET https://api.gurbaninow.com/v2/banis/1` returned HTTP 200
  `application/json`.
- `GET https://github.com/gurbaninow/api-public` returned HTTP 200
  GitHub repository HTML.
- `GET https://raw.githubusercontent.com/gurbaninow/api-public/master/`
  `README.md` returned HTTP 200 `text/plain` and states the API is
  deprecated.
- `GET https://raw.githubusercontent.com/wiki/gurbaninow/api-public/`
  `API-Documentation.md` returned HTTP 200 `text/plain` and documents the
  production v2 endpoints.
- `GET https://github.com/GurbaniNow/api/wiki/API-Documentation` returned
  GitHub HTTP 404 HTML and is no longer used as provider metadata.
- `GET https://api.gurbaninow.com/v2/search/DDrgj/?source=1`
  `&searchtype=3&results=2` returned HTTP 500 `application/json` with an
  upstream unsupported English search message. This is unreachable from
  normal CLI use because the CLI rejects search type 3 locally.

The exposed API routes returned normal JSON data. No `cf-mitigated` challenge
header, Cloudflare challenge HTML, CAPTCHA page, JavaScript redirect shell,
parked-domain page, or gateway interstitial was observed.

## 修复（Fix）

Updated `src/infrastructure/openApis/gurbaninowClient.ts` so response bodies
are read as text before JSON parsing. The client now detects representative
Cloudflare/challenge signals:

- `cf-mitigated: challenge`
- HTTP 403/429 `text/html`
- Cloudflare server header
- `Just a moment...` challenge title

Detected challenges throw:

- code: `OPEN_API_FAILED`
- message: GurbaniNow is returning a Cloudflare challenge HTML page
- details: provider id, HTTP status, status text, content type, and URL

Updated `test/gurbaninow-client.test.ts` with a regression test that feeds
`cf-mitigated: challenge` and `Just a moment...` HTML into the client and
asserts a clear provider-specific error.

Updated provider metadata in:

- `src/application/usecases/gurbaninow.ts`
- `src/providers/gurbaninow/index.ts`

The homepage, docs URL, API metadata, and endpoint sample sources now use
`https://github.com/gurbaninow/api-public` and its wiki documentation.

## 验证（Validation）

Passed:

- `node --import tsx --test test/gurbaninow-client.test.ts`
- `node --import tsx --test test/cli-output.test.ts --test-name-pattern`
  `"GurbaniNow"`
- `node --import tsx --test test/public-api-registry.test.ts`
  `--test-name-pattern "gurbaninow|GurbaniNow"`
- `node --import tsx --test test/contract/json-rpc.test.ts`
  `--test-name-pattern "GurbaniNow|gurbaninow"`
- direct CLI info and help commands for all three operations
- online `--persist` and offline replay for all three operations with
  isolated `PUBLIC_APIS_HOME_DIR`
- `PUBLIC_APIS_LIVE_E2E=1 node --import tsx --test`
  `test/live-api/gurbaninow.test.ts`
- `npm run lint`
- `npm run typecheck`
- `npm run spec:validate`
- `npm run test:contract` with 194 passing tests
- `npm run build`
- `npm run package:verify`
- `git diff --check`
- targeted secret scan for token-like assignments in source, tests, task
  records, and research reports
- `npm run test` with 1282 passing tests
- `npm run quality:check` with lint, typecheck, spec validation, full test,
  and contract stages passing

Known validation note: `node --import tsx --test test/cli-program.test.ts`
with `--test-name-pattern "GurbaniNow"` timed out because that monolithic
file spawns many help subprocesses. Direct GurbaniNow help commands completed
successfully and targeted registry/output/RPC tests passed.

## 残余不确定（Residual Uncertainty）

GurbaniNow is deprecated, archived, and unsupported upstream. Future service
availability may vary. The provider now fails clearly if future WAF/challenge
HTML appears, and cached/offline replay remains available for previously
persisted requests.
