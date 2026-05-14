# iDigBio Provider 审计记录（Audit Record）- Audited

- Provider: iDigBio
- Category: Science & Math
- Catalog URL: `https://github.com/idigbio/idigbio-search-api/wiki`
- Date: 2026-05-11 UTC
- Decision: audited
- Provider ID: `idigbio`
- Operations: `idigbio.records`, `idigbio.media`
- Research ID: `research_275c2b461f034a14afe2b43d4f5c0715`
- Artifact: `artifact_c04727c865f24b978de0e16b2668222b`

## 结论（Decision）

iDigBio provider 通过 command-driven runtime/TUI audit。实现继续暴露
documented HTTPS JSON REST endpoints：

- `GET https://search.idigbio.org/v2/search/records/`
- `GET https://search.idigbio.org/v2/search/media/`

CLI 只使用 read-only GET JSON search operations，并通过 documented `rq`
和 `mq` query parameters 发送 curated filters。POST、map creation、map
tiles、PNG rendering、browser map clicks、arbitrary raw query passthrough、
upload/delete/share workflows、image downloads、binary/base64 payloads 和
HTML scraping 均不暴露。

审计期间未观察到 Cloudflare challenge、CAPTCHA、gateway interstitial、
JavaScript redirect shell、parked-domain page、credential prompt 或
HTML-as-data。为满足 challenge regression guardrail，客户端已补充
provider-specific Cloudflare challenge HTML detection；未来 403/429
challenge HTML 会抛出明确 `OPEN_API_FAILED`，提示 retry later 或使用
cached/offline data，而不是普通 JSON parse failure。

审计还发现 blank optional text parameters 会先被 Zod schema 打成 raw
validation JSON。Provider schema 已调整为允许空字符串进入 iDigBio
normalizer，由 normalizer 修剪并回退到 documented defaults，避免对终端
用户暴露底层 schema JSON。

## Runtime Audit

实际执行并观察：

- `node --import tsx src/cli.ts apis info idigbio`
- `node --import tsx src/cli.ts apis run idigbio.records --help`
- `node --import tsx src/cli.ts apis run idigbio.media --help`
- `node --import tsx src/cli.ts apis run idigbio.records --format text --`
  `--scientific-name "Quercus robur" --family Fagaceae`
  `--country "United States" --has-image true --limit 3`
- `node --import tsx src/cli.ts apis run idigbio.records --format json --`
  `--scientific-name "Quercus robur" --family Fagaceae`
  `--country "United States" --has-image true --limit 2 --offset 1`
- `node --import tsx src/cli.ts apis run idigbio.media --format text --`
  `--scientific-name "Quercus robur" --media-type images`
  `--has-specimen true --limit 3`
- `node --import tsx src/cli.ts apis run idigbio.media --format json --`
  `--scientific-name "Quercus robur" --media-type images`
  `--limit 2 --offset 1`
- invalid probes for `--limit 51`, `--offset 10001`,
  blank `--scientific-name`, and blank `--media-type`
- online `--persist` followed by offline replay for both operations with an
  isolated `PUBLIC_APIS_HOME_DIR`

Representative outputs showed provider identity, endpoint, storage mode,
HTTPS JSON REST transport, open API/no-auth/no Chrome clickstream boundary,
query, pagination, last modified timestamp, specimen records, media metadata,
coordinates, access URLs, attribution URLs, count, and next commands. Text
output did not dump raw Elasticsearch queries, full upstream payloads, HTML
pages, warning pages, binary data, image bytes, or base64 data.

## Direct Endpoint Probes

Direct probes covered:

- `GET https://github.com/idigbio/idigbio-search-api/wiki` returned HTTP 200
  `text/html`.
- `GET https://search.idigbio.org/v2/search/records/?rq=...&limit=1`
  returned HTTP 200 `application/json; charset=utf-8`.
- `GET https://search.idigbio.org/v2/search/media/?rq=...&mq=...&limit=1`
  returned HTTP 200 `application/json; charset=utf-8`.
- `GET https://search.idigbio.org/v2/search/records/?limit=1` returned
  HTTP 200 `application/json; charset=utf-8`; the CLI keeps bounded defaults
  and curated filters instead of exposing broad raw passthrough.

The exposed API routes returned normal JSON data with `itemCount`,
`lastModified`, and bounded `items`. No `cf-mitigated` challenge header,
Cloudflare challenge HTML, CAPTCHA page, JavaScript redirect shell,
parked-domain page, or gateway interstitial was observed.

## 修复（Fix）

Updated `src/infrastructure/openApis/idigbioClient.ts` so response bodies are
read as text before JSON parsing. The client now detects representative
Cloudflare/challenge signals:

- `cf-mitigated: challenge`
- HTTP 403/429 `text/html`
- Cloudflare server header
- `Just a moment...` challenge title

Detected challenges throw:

- code: `OPEN_API_FAILED`
- message: iDigBio is returning a Cloudflare challenge HTML page
- details: provider id, HTTP status, status text, content type, and URL

Updated `test/idigbio-client.test.ts` with a regression test that feeds
`cf-mitigated: challenge` and `Just a moment...` HTML into the client and
asserts a clear provider-specific error.

Updated `src/providers/idigbio/index.ts` so optional text parameters are
validated by the provider normalizer. Blank optional text now maps to the
documented defaults instead of leaking raw Zod validation JSON.

## 验证（Validation）

Passed:

- `node --import tsx --test test/idigbio-client.test.ts`
- `node --import tsx --test test/cli-output.test.ts --test-name-pattern`
  `"iDigBio"`
- `node --import tsx --test test/public-api-registry.test.ts`
  `--test-name-pattern "idigbio|iDigBio"`
- `node --import tsx --test test/contract/json-rpc.test.ts`
  `--test-name-pattern "iDigBio|idigbio"`
- direct CLI info and help commands for both operations
- online `--persist` and offline replay for both operations with isolated
  `PUBLIC_APIS_HOME_DIR`
- direct endpoint probes for docs, records, media, and broad records search
- `PUBLIC_APIS_LIVE_E2E=1 node --import tsx --test`
  `test/live-api/idigbio.test.ts`
- `npm run lint`
- `npm run typecheck`
- `npm run spec:validate`
- `npm run test:contract` with 194 passing tests
- `npm run build`
- `npm run package:verify`
- split non-`cli-program` `test/*.test.ts` batches
- `npm run quality:check` with lint, typecheck, spec validation, full test,
  and contract stages passing
- full `npm run test` within `quality:check` with 1283 passing tests
- `git diff --check`
- targeted secret scan for iDigBio source, tests, task records, and report

Known validation note: one standalone `npm run test` run hit the 600 second
platform timeout without assertion failures. A later full `npm run
quality:check` completed successfully under the extended timeout.

## 残余不确定（Residual Uncertainty）

iDigBio search results depend on upstream index availability and data
freshness. The provider now fails clearly if future WAF/challenge HTML
appears, and cached/offline replay remains available for previously persisted
requests.
