# Church Calendar Provider 审计记录（Audit Record）- Audited

- Provider: Church Calendar
- Category: Calendar
- Catalog URL: `http://calapi.inadiutorium.cz/`
- Date: 2026-05-11 UTC
- Decision: audited
- Provider ID: `churchcalendar`
- Operations: `churchcalendar.day`, `churchcalendar.month`
- Research ID: `research_b82172860be14473a28507d305179987`
- Artifact: `artifact_611ecd09049545e2ae2c86fdc165bad6`

## 结论（Decision）

Church Calendar provider 通过 command-driven runtime/TUI audit。实现继续
暴露 documented HTTP JSON v0 API 的 day 和 month read-only routes，并明确
披露 HTTP-only transport。CLI 不使用 API key、OAuth、account workflow、
session cookies、browser clickstream、HTML scraping、upload/delete/share
workflow、binary payload 或 base64 payload。

审计期间未观察到 Cloudflare challenge、CAPTCHA、gateway interstitial、
JavaScript redirect shell、parked-domain page、credential prompt 或
HTML-as-data。为满足 challenge regression guardrail，客户端已补充
provider-specific Cloudflare challenge HTML detection；未来 403/429
challenge HTML 会抛出明确 `OPEN_API_FAILED`，提示 retry later 或使用
cached/offline data，而不是普通 JSON parse failure。

## Runtime Audit

实际执行并观察：

- `npx tsx src/cli.ts apis info churchcalendar --format text`
- `npx tsx src/cli.ts apis info churchcalendar --format json`
- `npx tsx src/cli.ts apis run churchcalendar.day --help`
- `npx tsx src/cli.ts apis run churchcalendar.month --help`
- `npx tsx src/cli.ts apis run churchcalendar.day --format text --`
  `--date 2026-05-10`
- `npx tsx src/cli.ts apis run churchcalendar.day --format json --`
  `--date 2026-05-10`
- `npx tsx src/cli.ts apis run churchcalendar.month --format text --`
  `--year 2026 --month 5 --limit 2`
- `npx tsx src/cli.ts apis run churchcalendar.month --format json --`
  `--year 2026 --month 5 --limit 2`
- `npx tsx src/cli.ts apis run churchcalendar.day --format text --`
  `--date 2026-12-25 --language la --calendar general-la`
- `npx tsx src/cli.ts apis run churchcalendar.month --format json --`
  `--year 2026 --month 12 --limit 2 --language la --calendar general-la`
- invalid probes for `--date 2026-02-30`, `--language de`,
  `--month 13`, and `--limit 32`
- online `--persist` followed by offline replay for both operations with an
  isolated `PUBLIC_APIS_HOME_DIR`

Representative outputs showed provider identity, endpoint, storage mode,
HTTP JSON transport, open API/no-auth/no Chrome clickstream boundary, query,
calendar/language scope, day metadata, month count, limit cap, celebrations,
and next commands. Text output did not dump raw JSON, HTML pages, warning
pages, binary data, or base64 data.

## Direct Endpoint Probes

Direct probes covered:

- `GET http://calapi.inadiutorium.cz/api/v0/en/calendars/general-en/`
  `2026/5/10` returned HTTP 200 `application/json; charset=utf-8`
  with one liturgical day object.
- `GET http://calapi.inadiutorium.cz/api/v0/en/calendars/general-en/`
  `2026/5` returned HTTP 200 `application/json; charset=utf-8`
  with a month array.
- `GET http://calapi.inadiutorium.cz/api-doc` returned HTTP 200
  `text/html` documentation content.
- `GET http://calapi.inadiutorium.cz/swagger.yml` returned Swagger YAML
  content with `text/html` response metadata.
- `GET http://calapi.inadiutorium.cz/api/v0/en/calendars/nope/`
  `2026/5/10` returned HTTP 400 `application/json` with a provider error.

The exposed day and month routes returned normal JSON data. Documentation HTML
and Swagger YAML remain outside operation parsing. The invalid calendar route
is unreachable from normal CLI use because calendar IDs are validated locally.

## 修复（Fix）

Updated `src/infrastructure/openApis/churchCalendarClient.ts` so representative
Cloudflare challenge HTML is detected before JSON parsing. The provider now
throws:

- code: `OPEN_API_FAILED`
- message: Church Calendar is returning a Cloudflare challenge HTML page
- details: provider id, HTTP status, URL, and content type

Updated `test/church-calendar-client.test.ts` with a regression test that feeds
`cf-mitigated: challenge` and `Just a moment...` HTML into the client and
asserts a clear provider-specific error.

## 验证（Validation）

Passed:

- `node --import tsx --test test/church-calendar-client.test.ts`
- `node --import tsx --test test/cli-output.test.ts --test-name-pattern`
  `"Church Calendar"`
- `node --import tsx --test test/public-api-registry.test.ts`
  `--test-name-pattern "churchcalendar|Church Calendar"`
- `node --import tsx --test test/contract/json-rpc.test.ts`
  `--test-name-pattern "churchcalendar"`
- `npm run lint`
- `npm run typecheck`
- `npm run spec:validate`
- `npm run test:contract`
- `npm run build`
- `npm run package:verify`
- `PUBLIC_APIS_LIVE_E2E=1 node --import tsx --test`
  `test/live-api/church-calendar.test.ts`
- split `test/*.test.ts` batches excluding `test/cli-program.test.ts`
- `git diff --check`
- targeted secret scan for token-like assignments in source, tests, task
  records, and research reports

`npm run quality:check` reached `npm run test` without assertion failures but
timed out after 600 seconds in the monolithic test run. A targeted
`test/cli-program.test.ts` pattern also timed out after 300 seconds because
that file launches many synchronous CLI subprocesses. Church Calendar coverage
is provided by direct CLI smoke, targeted client/output/registry/RPC tests,
contract tests, build/package gates, live e2e, and split test batches.

## 残余不确定（Residual Uncertainty）

The upstream service is HTTP-only, so confidentiality and availability are
weaker than HTTPS providers. The manifest, JSON metadata, endpoint catalog,
and text output disclose HTTP JSON transport. Future upstream WAF/challenge
HTML should now fail clearly with retry/offline guidance rather than being
treated as API data.
