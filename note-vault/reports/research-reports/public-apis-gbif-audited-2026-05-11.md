# GBIF Provider 审计记录（Audit Record）- Audited

- Provider: GBIF
- Category: Science & Math
- Catalog URL: `https://www.gbif.org/developer/summary`
- Date: 2026-05-11 UTC
- Decision: audited
- Provider ID: `gbif`
- Operations: `gbif.species`, `gbif.occurrences`
- Research ID: `research_957dbb8798b845b9a28fe697916f3b5a`
- Artifact: `artifact_f266a6e4f49b49d4ae3ba3019adece5a`

## 结论（Decision）

GBIF provider 通过 command-driven runtime/TUI audit。实现继续暴露
documented HTTPS JSON REST search endpoints：

- `GET https://api.gbif.org/v1/species/search`
- `GET https://api.gbif.org/v1/occurrence/search`

CLI 只使用 read-only GET JSON search。Occurrence downloads、registry
writes、image APIs、POST/PUT/DELETE、`www.gbif.org` scraping、account
workflow、API key、OAuth、cookies、browser clickstream、upload/delete/share
workflow、binary payload 和 base64 payload 均不暴露。

审计期间未观察到 Cloudflare challenge、CAPTCHA、gateway interstitial、
JavaScript redirect shell、parked-domain page、credential prompt 或
HTML-as-data。为满足 challenge regression guardrail，客户端已补充
provider-specific Cloudflare challenge HTML detection；未来 403/429
challenge HTML 会抛出明确 `OPEN_API_FAILED`，提示 retry later 或使用
cached/offline data，而不是普通 JSON parse failure。

## Runtime Audit

实际执行并观察：

- `npx tsx src/cli.ts apis info gbif --format text`
- `npx tsx src/cli.ts apis info gbif --format json`
- `npx tsx src/cli.ts apis run gbif.species --help`
- `npx tsx src/cli.ts apis run gbif.occurrences --help`
- `npx tsx src/cli.ts apis run gbif.species --format text --`
  `--query 'Quercus robur' --rank SPECIES --limit 2`
- `npx tsx src/cli.ts apis run gbif.species --format json --`
  `--query 'Quercus robur' --rank SPECIES --limit 2`
- `npx tsx src/cli.ts apis run gbif.occurrences --format text --`
  `--scientific-name 'Quercus robur' --country GB --limit 2`
- `npx tsx src/cli.ts apis run gbif.occurrences --format json --`
  `--scientific-name 'Quercus robur' --country GB --limit 2`
- species filter combination with query, status, higher taxon key, limit,
  and offset
- occurrence filter combination with scientific name, country, year,
  basis of record, coordinate flag, and limit
- invalid probes for `--limit 51`, `--offset 10001`, `--country GBR`,
  and `--year twenty`
- online `--persist` followed by offline replay for both operations with an
  isolated `PUBLIC_APIS_HOME_DIR`

Representative outputs showed provider identity, endpoint, storage mode,
HTTPS JSON REST transport, open API/no-auth/no Chrome clickstream boundary,
query, pagination, total count, returned count, taxonomy metadata,
occurrence coordinates, dataset/license fields, issues, media counts, and
next commands. Text output did not dump raw occurrence objects, HTML pages,
warning pages, binary data, image bytes, or base64 data.

## Direct Endpoint Probes

Direct probes covered:

- `GET https://api.gbif.org/v1/species/search?q=Quercus%20robur`
  `&rank=SPECIES&limit=2` returned HTTP 200 `application/json`.
- `GET https://api.gbif.org/v1/occurrence/search?scientificName=`
  `Quercus%20robur&country=GB&limit=2` returned HTTP 200
  `application/json`.
- `GET https://techdocs.gbif.org/en/openapi/` returned HTTP 200
  `text/html; charset=UTF-8` documentation content.
- `GET https://techdocs.gbif.org/openapi/checklistbank.json` returned
  HTTP 200 `application/json`.
- `GET https://techdocs.gbif.org/openapi/occurrence.json` returned
  HTTP 200 `application/json`.
- invalid offset probes returned HTTP 400 `text/plain` provider errors.

The exposed species and occurrence routes returned normal JSON data. Docs
HTML remains outside operation parsing. Invalid offset errors are unreachable
from normal CLI use because the CLI caps offset at 10000.

## 修复（Fix）

Updated `src/infrastructure/openApis/gbifClient.ts` so response bodies are read
as text before JSON parsing. The client now detects representative
Cloudflare/challenge signals:

- `cf-mitigated: challenge`
- HTTP 403/429 `text/html`
- Cloudflare server header
- `Just a moment...` challenge title
- browser verification challenge markers

Detected challenges throw:

- code: `OPEN_API_FAILED`
- message: GBIF is returning a Cloudflare challenge HTML page
- details: provider id, HTTP status, status text, content type, and URL

Updated `test/gbif-client.test.ts` with a regression test that feeds
`cf-mitigated: challenge` and `Just a moment...` HTML into the client and
asserts a clear provider-specific error.

Updated `test/cli-program.test.ts` to scope one USGS Earthquake help assertion
to the operation help block. The full run help intentionally includes the
global `--format` option, while the operation-specific option block must not.

## 验证（Validation）

Passed:

- `node --import tsx --test test/gbif-client.test.ts`
- `node --import tsx --test test/cli-output.test.ts --test-name-pattern`
  `"GBIF"`
- `node --import tsx --test test/public-api-registry.test.ts`
  `--test-name-pattern "gbif|GBIF"`
- `node --import tsx --test test/contract/json-rpc.test.ts`
  `--test-name-pattern "GBIF|gbif"`
- online `--persist` and offline replay for both GBIF operations with
  isolated `PUBLIC_APIS_HOME_DIR`
- `PUBLIC_APIS_LIVE_E2E=1 node --import tsx --test`
  `test/live-api/gbif.test.ts`
- `npm run lint`
- `npm run typecheck`
- `npm run spec:validate`
- `npm run test:contract`
- `npm run build`
- `npm run package:verify`
- `git diff --check`
- targeted secret scan for token-like assignments in source, tests, task
  records, and research reports
- `npm run test` with 1281 passing tests
- `npm run quality:check` with lint, typecheck, spec validation, full test,
  and contract stages passing

## 残余不确定（Residual Uncertainty）

GBIF availability and rate behavior may vary with upstream service load.
The provider now fails clearly if future WAF/challenge HTML appears, and
cached/offline replay remains available for previously persisted requests.
