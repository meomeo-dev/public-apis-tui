# icsdb Provider 审计记录（Audit Record）- Audited

- Provider: icsdb Non-Working Days
- Category: Calendar
- Catalog URL: `https://github.com/gadael/icsdb`
- Date: 2026-05-12 UTC
- Decision: audited
- Provider ID: `icsdb`
- Operations: `icsdb.calendars`, `icsdb.events`
- Research ID: `research_9b0b57ea4e7e4b8bbc6171cc37cb1668`
- Artifact: `artifact_1fdd5dc5c7fc4a91b79967b1e2a24909`

## 结论（Decision）

icsdb provider 通过 command-driven runtime/TUI audit。实现继续暴露
documented no-auth GitHub-hosted calendar surfaces：

- `GET https://api.github.com/repos/gadael/icsdb/git/trees/master?recursive=1`
- `GET https://raw.githubusercontent.com/gadael/icsdb/master/build/{locale}/`
  `{slug}-nonworkingdays.ics`

CLI 只使用 curated locale、query、limit 和 fixed-path slug controls。
Output parses VEVENT fields into bounded JSON and readable text projections
with source URLs, counts, open API boundary, freshness warning, and offline
replay commands. It does not expose GitHub HTML scraping, arbitrary URL/path
proxying, raw ICS dumps, uploads, deletes, sharing, binary/base64 payloads,
account flows, or browser clickstream.

审计期间未观察到 Cloudflare challenge、CAPTCHA、gateway interstitial、
JavaScript redirect shell、parked-domain page、credential prompt 或
HTML-as-data。为满足 challenge regression guardrail，客户端已补充
provider-specific Cloudflare challenge HTML detection；未来 403/429
challenge HTML 会抛出明确 `OPEN_API_FAILED`，提示 retry later 或使用
cached/offline data，而不是普通 JSON parse failure 或 malformed ICS
failure。

## Runtime Audit

实际执行并观察：

- `node --import tsx src/cli.ts apis info icsdb`
- `node --import tsx src/cli.ts apis run icsdb.calendars --help`
- `node --import tsx src/cli.ts apis run icsdb.events --help`
- `node --import tsx src/cli.ts apis run icsdb.calendars`
  `--online --format text -- --locale en-US --query us-all --limit 5`
- `node --import tsx src/cli.ts apis run icsdb.calendars`
  `--online --format json -- --locale fr-FR --query france --limit 3`
- `node --import tsx src/cli.ts apis run icsdb.events`
  `--online --format text -- --locale en-US --slug us-all`
  `--query day --limit 5`
- `node --import tsx src/cli.ts apis run icsdb.events`
  `--online --format json -- --locale fr-FR --slug france --limit 3`
- invalid probes for `--locale de-DE`, `--slug ../us-all`,
  `--slug us-all.ics`, and `--limit 101`
- online `--persist` followed by offline replay with an isolated
  `PUBLIC_APIS_HOME_DIR` for both operations

Representative outputs showed provider identity, endpoint, storage mode,
HTTPS GitHub API/raw text transport, open API/no-auth/no Chrome clickstream
boundary, query, counts, freshness warning, source URLs, next commands, and
replay commands. Text output did not dump GitHub HTML pages, warning pages,
raw ICS bodies, binary data, image bytes, or base64 data.

Invalid locale, path-like slug, file-extension slug, and out-of-range limit
probes exited nonzero with `INVALID_ARGUMENT` before unsafe requests could be
constructed.

## Direct Endpoint Probes

Direct probes covered:

- `GET https://api.github.com/repos/gadael/icsdb/git/trees/master?recursive=1`
  returned HTTP 200 `application/json; charset=utf-8`.
- `GET https://raw.githubusercontent.com/gadael/icsdb/master/build/en-US/`
  `us-all-nonworkingdays.ics` returned HTTP 200 `text/plain; charset=utf-8`
  and a body beginning with `BEGIN:VCALENDAR`.
- `GET https://raw.githubusercontent.com/gadael/icsdb/master/build/README.md`
  returned HTTP 200 `text/plain; charset=utf-8`.
- `GET https://raw.githubusercontent.com/gadael/icsdb/master/build/en-US/`
  `definitely-missing-nonworkingdays.ics` returned HTTP 404
  `text/plain; charset=utf-8` with `404: Not Found`.

The exposed tree and raw ICS routes returned normal GitHub JSON or calendar
text. No `cf-mitigated` challenge header, challenge title, CAPTCHA page,
JavaScript redirect shell, parked-domain page, gateway interstitial, or
HTML-as-data was observed.

## 修复（Fix）

Updated `src/infrastructure/openApis/icsdbClient.ts` so response bodies are
read as text before JSON or ICS parsing. The client now detects
representative Cloudflare/challenge signals on both the GitHub tree route and
the raw calendar route:

- `cf-mitigated: challenge`
- HTTP 403/429 `text/html`
- Cloudflare server header
- `Just a moment...` challenge title

Detected challenges throw:

- code: `OPEN_API_FAILED`
- message: icsdb endpoint is returning a Cloudflare challenge HTML page
- details: provider id, HTTP status, status text, content type, and URL

Updated `test/icsdb-client.test.ts` with regression coverage that feeds
`cf-mitigated: challenge` and `Just a moment...` HTML into both client paths
and asserts a clear provider-specific error.

Existing non-JSON, non-OK, and non-ICS errors now reuse shared response
details.

## 验证（Validation）

Passed:

- `node --import tsx --test test/icsdb-client.test.ts`
- `node --import tsx --test test/cli-output.test.ts --test-name-pattern`
  `"icsdb"`
- `node --import tsx --test test/public-api-registry.test.ts`
  `--test-name-pattern "icsdb|Non-Working"`
- `node --import tsx --test test/contract/json-rpc.test.ts`
  `--test-name-pattern "icsdb"`
- direct CLI info and help commands
- online `--persist` and offline replay with isolated `PUBLIC_APIS_HOME_DIR`
- direct endpoint probes for GitHub tree, raw ICS, build README, and missing
  raw file
- `PUBLIC_APIS_LIVE_E2E=1 node --import tsx --test`
  `test/live-api/icsdb.test.ts`
- `npm run lint`
- `npm run typecheck`
- `npm run spec:validate`
- `npm run build:tarball`
- `npm run package:verify`
- `npm run quality:check` with lint, typecheck, spec validation, full test,
  and contract stages passing
- full `npm run test` within `quality:check` with 1295 passing tests
- `npm run test:contract` within `quality:check` with 194 passing tests
- `git diff --check`
- touched-file line-width scan for icsdb source, tests, and report
- targeted secret scan for icsdb source, tests, task row, and report

## 残余不确定（Residual Uncertainty）

icsdb depends on GitHub API and raw content availability, unauthenticated
GitHub rate limits, and historically generated static calendar files. The
provider now fails clearly if future WAF/challenge HTML appears, and
cached/offline replay remains available for previously persisted requests.
Holiday-critical decisions should still be checked against official local
sources.
