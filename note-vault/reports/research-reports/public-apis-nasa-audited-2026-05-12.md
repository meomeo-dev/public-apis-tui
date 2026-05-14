# NASA Provider 审计记录（Audit Record）- Audited

- Provider: NASA
- Category: Science & Math
- Catalog URL: `https://api.nasa.gov`
- Date: 2026-05-12 UTC
- Decision: audited
- Provider ID: `nasa`
- Operations: `nasa.search`, `nasa.asset`
- Research ID: `research_fa36150fe499426a8fc4d7127afdb8b8`
- Artifact: `artifact_1cb7c750d2d74c1d88d2043d12ae7c42`

## 结论（Decision）

NASA provider 通过 command-driven runtime/TUI audit。实现继续暴露
documented Image and Video Library HTTPS JSON endpoints：

- `GET https://images-api.nasa.gov/search`
- `GET https://images-api.nasa.gov/asset/{nasa_id}`

CLI 只使用 curated search text、media type、center、year range、page、
page size、NASA id 和 manifest limit controls。`api.nasa.gov` keyed
endpoints、DEMO_KEY workflows、browser scraping、browser clickstream、
HTML parsing、image/audio/video downloads、captions/metadata file fetching、
binary/base64 payloads、upload/delete/share workflows、account behavior 和
arbitrary route proxying 均不暴露。

审计期间未观察到 Cloudflare challenge、CAPTCHA、gateway interstitial、
JavaScript redirect shell、parked-domain page、credential prompt 或
HTML-as-data。为满足 challenge regression guardrail，客户端已补充
provider-specific Cloudflare challenge HTML detection；未来 403/429
challenge HTML 会抛出明确 `OPEN_API_FAILED`，提示 retry later 或使用
cached/offline data，而不是普通 JSON parse failure。

## Runtime Audit

实际执行并观察：

- `node --import tsx src/cli.ts apis info nasa`
- `node --import tsx src/cli.ts apis run nasa.search --help`
- `node --import tsx src/cli.ts apis run nasa.asset --help`
- `node --import tsx src/cli.ts apis run nasa.search`
  `--format text -- --query "apollo 11" --media-type image --page-size 3`
- `node --import tsx src/cli.ts apis run nasa.search`
  `--format json -- --query "apollo 11" --media-type image --page-size 2`
- `node --import tsx src/cli.ts apis run nasa.search`
  `--format text -- --query "mars rover" --media-type image --center JPL`
  `--year-start 2012 --year-end 2013 --page-size 3`
- `node --import tsx src/cli.ts apis run nasa.search`
  `--format json -- --query "apollo 11" --media-type video --page-size 2`
- `node --import tsx src/cli.ts apis run nasa.asset`
  `--format text -- --nasa-id as11-40-5874 --limit 5`
- `node --import tsx src/cli.ts apis run nasa.asset`
  `--format json -- --nasa-id as11-40-5874 --limit 3`
- empty search probe for `--query zzzzunlikelynasamedia`
- invalid probes for `--page-size 51`, `--media-type pdf`,
  `--year-start 1970 --year-end 1969`, and `--limit 0`
- online `--persist` followed by offline replay with an isolated
  `PUBLIC_APIS_HOME_DIR` for both operations

Representative outputs showed provider identity, endpoint, storage mode,
HTTPS JSON transport, open API/no-auth/no Chrome clickstream boundary,
query, pagination, item metadata, manifest file metadata, next commands, and
replay commands. Text output did not dump HTML pages, warning pages, binary
data, image bytes, audio/video bytes, caption bodies, metadata file bodies,
or base64 data.

Invalid probes exited nonzero with `INVALID_ARGUMENT` and clear local
validation messages before any out-of-range request.

## Direct Endpoint Probes

Direct probes covered:

- `GET https://images-api.nasa.gov/search?q=apollo%2011&media_type=image`
  with `page_size=1` returned HTTP 200 `application/json`.
- `GET https://images-api.nasa.gov/asset/as11-40-5874` returned HTTP 200
  `application/json`.
- `GET https://images.nasa.gov/docs/images.nasa.gov_api_docs.pdf` returned
  HTTP 200 `application/pdf` documentation.
- `GET https://api.nasa.gov/planetary/apod` returned HTTP 403
  `application/json` with `API_KEY_MISSING`.

The exposed Image Library API routes returned normal collection JSON.
No `cf-mitigated` challenge header, challenge title, CAPTCHA page,
JavaScript redirect shell, parked-domain page, or gateway interstitial was
observed. Search and asset responses were served by nginx/CloudFront without
challenge mitigation.

## 修复（Fix）

Updated `src/infrastructure/openApis/nasaClient.ts` so response bodies are
read as text before JSON parsing. The client now detects representative
Cloudflare/challenge signals:

- `cf-mitigated: challenge`
- HTTP 403/429 `text/html`
- Cloudflare server header
- `Just a moment...` challenge title

Detected challenges throw:

- code: `OPEN_API_FAILED`
- message: NASA Images is returning a Cloudflare challenge HTML page
- details: provider id, HTTP status, status text, content type, and URL

Updated `test/nasa-client.test.ts` with a regression test that feeds
`cf-mitigated: challenge` and `Just a moment...` HTML into the client and
asserts a clear provider-specific error.

Existing non-JSON and non-OK errors now reuse shared response details.

## 验证（Validation）

Passed:

- `node --import tsx --test test/nasa-client.test.ts`
- `node --import tsx --test test/cli-output.test.ts --test-name-pattern`
  `"NASA"`
- `node --import tsx --test test/public-api-registry.test.ts`
  `--test-name-pattern "NASA|nasa"`
- `node --import tsx --test test/contract/json-rpc.test.ts`
  `--test-name-pattern "NASA|nasa"`
- direct CLI info and help commands
- online `--persist` and offline replay with isolated `PUBLIC_APIS_HOME_DIR`
- direct endpoint probes for search, asset, docs PDF, and APOD boundary
- `PUBLIC_APIS_LIVE_E2E=1 node --import tsx --test`
  `test/live-api/nasa.test.ts`
- `npm run lint`
- `npm run typecheck`
- `npm run spec:validate`
- `npm run build:tarball`
- `npm run package:verify`
- `npm run quality:check` with lint, typecheck, spec validation, full test,
  and contract stages passing
- full `npm run test` within `quality:check` with 1292 passing tests
- `npm run test:contract` within `quality:check` with 194 passing tests
- `git diff --check`
- touched-file line-width scan for NASA source, tests, and report
- targeted secret scan for NASA source, tests, task row, and report

## 残余不确定（Residual Uncertainty）

NASA Image and Video Library metadata endpoints are served through
CloudFront, and no public SLA or quota was found for the selected no-auth
metadata routes. The provider now fails clearly if future WAF/challenge HTML
appears, and cached/offline replay remains available for previously
persisted requests.
