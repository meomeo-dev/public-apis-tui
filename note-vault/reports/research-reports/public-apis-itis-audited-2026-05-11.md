# ITIS Provider 审计记录（Audit Record）- Audited

- Provider: ITIS
- Category: Science & Math
- Catalog URL: `https://www.itis.gov/ws_description.html`
- Date: 2026-05-11 UTC
- Decision: audited
- Provider ID: `itis`
- Operations: `itis.search`, `itis.record`
- Research ID: `research_f7bf314538884b5594fbf2e7d4e66670`
- Artifact: `artifact_08e41817f4c7427897e587e942f878c8`

## 结论（Decision）

ITIS provider 通过 command-driven runtime/TUI audit。实现继续暴露
documented HTTPS JSON service endpoints：

- `GET https://www.itis.gov/ITISWebService/jsonservice/`
  `searchByScientificName?srchKey={query}`
- `GET https://www.itis.gov/ITISWebService/jsonservice/`
  `getFullRecordFromTSN?tsn={tsn}`

CLI 只使用 read-only taxonomy resources，并在本地执行 bounded query、
limit、offset、TSN、common-name limit 和 synonym limit validation。
Arbitrary web-service route proxying、SOAP client generation、bulk database
downloads、HTML scraping、browser clickstream、unbounded hierarchy traversal、
upload/delete/share workflows、binary/base64 payloads 和 mutating operations
均不暴露。

审计期间未观察到 Cloudflare challenge、CAPTCHA、gateway interstitial、
JavaScript redirect shell、parked-domain page、credential prompt 或
HTML-as-data。为满足 challenge regression guardrail，客户端已补充
provider-specific Cloudflare challenge HTML detection；未来 403/429
challenge HTML 会抛出明确 `OPEN_API_FAILED`，提示 retry later 或使用
cached/offline data，而不是普通 JSON parse failure。

审计还发现缺失但格式有效的 TSN 会返回 HTTP 200 empty body。客户端已
补充 empty-response guard，明确提示 ITIS returned an empty response
instead of the documented JSON payload，而不是把空响应报告为 generic
non-JSON。

## Runtime Audit

实际执行并观察：

- `node --import tsx src/cli.ts apis info itis`
- `node --import tsx src/cli.ts apis run itis.search --help`
- `node --import tsx src/cli.ts apis run itis.record --help`
- `node --import tsx src/cli.ts apis run itis.search --format text --`
  `--query "Quercus robur" --limit 5`
- `node --import tsx src/cli.ts apis run itis.search --format json --`
  `--query "Quercus" --limit 3 --offset 1`
- `node --import tsx src/cli.ts apis run itis.record --format text --`
  `--tsn 19405 --common-limit 3 --synonym-limit 4`
- `node --import tsx src/cli.ts apis run itis.record --format json --`
  `--tsn 19405 --common-limit 1 --synonym-limit 1`
- empty search for `--query "zzzzunlikelytaxon"`
- invalid probes for `--limit 51`, `--offset 501`, `--tsn abc`,
  `--common-limit 21`, and `--synonym-limit 31`
- missing-but-format-valid TSN probe for `--tsn 999999999`
- online `--persist` followed by offline replay with an isolated
  `PUBLIC_APIS_HOME_DIR`

Representative outputs showed provider identity, endpoint, storage mode,
HTTPS JSON service transport, open API/no-auth/no Chrome clickstream boundary,
query, pagination, TSN metadata, common names, synonyms, hierarchy fields,
official links, next commands, and replay commands. Text output did not dump
HTML pages, warning pages, binary data, image bytes, or base64 data.

Invalid probes exited nonzero with `INVALID_ARGUMENT` and clear local
validation messages before any out-of-range request.

## Direct Endpoint Probes

Direct probes covered:

- `GET https://www.itis.gov/ws_description.html` returned HTTP 200
  `text/html; charset=ISO-8859-1`.
- `GET .../searchByScientificName?srchKey=Quercus%20robur` returned HTTP 200
  `text/json;charset=ISO-8859-1`.
- `GET .../searchByScientificName?srchKey=zzzzunlikelytaxon` returned HTTP 200
  `text/json;charset=ISO-8859-1` with `scientificNames` containing `null`.
- `GET .../getFullRecordFromTSN?tsn=19405` returned HTTP 200
  `text/json;charset=ISO-8859-1`.
- `GET .../getFullRecordFromTSN?tsn=999999999` returned HTTP 200 with an
  empty body and no useful content type.

The exposed API routes returned normal taxonomy JSON for valid inputs. No
`cf-mitigated` challenge header, Cloudflare server header, challenge title,
CAPTCHA page, JavaScript redirect shell, parked-domain page, or gateway
interstitial was observed.

## 修复（Fix）

Updated `src/infrastructure/openApis/itisClient.ts` so response bodies are
read as text before JSON parsing. The client now detects representative
Cloudflare/challenge signals:

- `cf-mitigated: challenge`
- HTTP 403/429 `text/html`
- Cloudflare server header
- `Just a moment...` challenge title

Detected challenges throw:

- code: `OPEN_API_FAILED`
- message: ITIS is returning a Cloudflare challenge HTML page
- details: provider id, HTTP status, status text, content type, and URL

The same response path now rejects empty response bodies before JSON parsing.
This covers the observed missing TSN behavior, where ITIS returns HTTP 200
with an empty body instead of a JSON error payload.

Updated `test/itis-client.test.ts` with regression tests for representative
Cloudflare challenge HTML and empty upstream responses.

Existing non-JSON and non-OK errors now reuse shared response details.

## 验证（Validation）

Passed:

- `node --import tsx --test test/itis-client.test.ts`
- `node --import tsx --test test/cli-output.test.ts --test-name-pattern`
  `"ITIS"`
- `node --import tsx --test test/public-api-registry.test.ts`
  `--test-name-pattern "itis|ITIS"`
- `node --import tsx --test test/contract/json-rpc.test.ts`
  `--test-name-pattern "itis|ITIS"`
- direct CLI info and help commands
- online `--persist` and offline replay with isolated `PUBLIC_APIS_HOME_DIR`
- direct endpoint probes for docs, exposed resources, empty search, and
  missing TSN
- `PUBLIC_APIS_LIVE_E2E=1 node --import tsx --test`
  `test/live-api/itis.test.ts`
- `npm run lint`
- `npm run typecheck`
- `npm run spec:validate`
- `npm run build`
- `npm run package:verify`
- `npm run quality:check` with lint, typecheck, spec validation, full test,
  and contract stages passing
- full `npm run test` within `quality:check` with 1288 passing tests
- `npm run test:contract` within `quality:check` with 194 passing tests
- `git diff --check`
- touched-file line-width scan for ITIS source and tests
- targeted secret scan for ITIS source and tests

## 残余不确定（Residual Uncertainty）

ITIS taxonomy data depends on upstream availability and data freshness. The
provider now fails clearly if future WAF/challenge HTML or empty upstream
responses appear, and cached/offline replay remains available for previously
persisted requests.
