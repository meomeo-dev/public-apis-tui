# Urantia Papers Provider 审计记录（Audit Record）- Audited

- Provider: Urantia Papers
- Category: Books
- Catalog URL: `https://urantia.dev`
- Date: 2026-05-12 UTC
- Decision: audited
- Provider ID: `urantia`
- Operations: `urantia.toc`, `urantia.paper`, `urantia.paragraph`,
  `urantia.search`
- Research ID: `research_a43047dcac644ec5a141d4b83382c4da`
- Artifact: `artifact_44be2196f00e470d9e575c0e970ede47`

## 结论（Decision）

Urantia Papers provider 通过 command-driven runtime/TUI audit。实现继续暴露
no-auth HTTPS JSON REST endpoints under `https://api.urantia.dev`:

- `GET /toc`
- `GET /papers/{paperId}`
- `GET /paragraphs/{ref}`
- `GET /search`

CLI 只使用 curated TOC pagination、paper id、paragraph reference、full-text
query、search type、language、limit、page、paper filter 与 part filter
controls。输出保持 bounded text/JSON projection，包含 source、pagination、
navigation、storage mode 与 open-API boundary metadata。

Auth/account routes、MCP、AI tool-schema endpoints、audio media route、OG
image route、embeddings/vector routes、semantic search、browser scraping、
browser clickstream、upload/delete/share workflows、binary payloads、base64
payloads 与 arbitrary route proxying remain excluded.

## Runtime Audit

实际执行并观察：

- `npx tsx src/cli.ts apis info urantia`
- `npx tsx src/cli.ts apis run urantia.toc --help`
- `npx tsx src/cli.ts apis run urantia.paper --help`
- `npx tsx src/cli.ts apis run urantia.paragraph --help`
- `npx tsx src/cli.ts apis run urantia.search --help`
- `npx tsx src/cli.ts apis run urantia.toc --format text`
  `-- --limit 2 --offset 0`
- `npx tsx src/cli.ts apis run urantia.paper --format text`
  `-- --paper-id 0 --limit 2 --offset 0 --lang eng`
- `npx tsx src/cli.ts apis run urantia.paragraph --format json`
  `-- --ref 0:0.1 --lang eng`
- `npx tsx src/cli.ts apis run urantia.search --format json`
  `-- --query "thought adjuster" --type phrase --limit 3 --page 0`
  `--paper-id 108 --part-id 3 --lang eng`
- empty-state probe with query `zznotfoundzz`
- boundary probe for TOC offset `4`
- invalid probes for paper id `197`, ref `../secret`, limit `51`, and
  search type `semantic`
- online `--persist` followed by offline replay with isolated
  `PUBLIC_APIS_HOME_DIR` for all four operations

Representative outputs showed provider identity, endpoint, storage mode,
HTTPS JSON REST transport, no-auth/open REST boundary, no Chrome clickstream
boundary, pagination, navigation, source metadata, again/replay commands, and
next command hints. Text output did not dump HTML, warning pages, binary data,
base64 data, upstream `htmlText`, audio/video payloads, embeddings, or raw
media objects.

Invalid paper id, unsafe reference, oversized limit, and unsupported search
type probes exited nonzero with `INVALID_ARGUMENT` before unsafe requests were
built.

## Direct Endpoint Probes

Direct probes covered:

- API root; returned JSON identifying the Urantia Papers API.
- `GET /openapi.json`; returned OpenAPI JSON.
- `GET /llms.txt`; returned `text/plain` documentation metadata.
- docs homepage; returned `text/html` and remained outside runtime data.
- `GET /toc`; returned HTTP 200 `application/json`.
- `GET /papers/0?lang=eng`; returned HTTP 200 `application/json`.
- `GET /paragraphs/0%3A0.1?lang=eng`; returned HTTP 200
  `application/json`.
- `GET /search?...`; returned HTTP 200 `application/json`.
- `GET /audio/0:0.1`; returned JSON CDN audio URLs outside CLI projection.
- `GET /og/0:0.1`; returned `image/png` outside CLI projection.
- `/embeddings` and an unknown route; returned HTTP 404 `text/plain`.

`server: cloudflare` was present on live responses. No `cf-mitigated:
challenge`, `Just a moment...` title, CAPTCHA page, JavaScript redirect shell,
parked-domain page, gateway interstitial, credential flow, binary runtime
payload, or base64 runtime payload was observed for exposed operations.

## 修复（Fix）

Updated `src/infrastructure/openApis/urantiaClient.ts` so response bodies are
read as text, checked for representative Cloudflare/challenge signals, then
parsed as JSON:

- HTTP 403/429 `text/html`
- `cf-mitigated: challenge`
- Cloudflare server header
- `Just a moment...` challenge title

Detected challenges throw:

- code: `OPEN_API_FAILED`
- message: Urantia Papers API is returning a Cloudflare challenge HTML page
- details: provider id, HTTP status, status text, content type, and URL

Updated `test/urantia-client.test.ts` with regression coverage for challenge
HTML.

## 验证（Validation）

Passed:

- `node --import tsx --test test/urantia-client.test.ts`
- `node --import tsx --test test/cli-output.test.ts --test-name-pattern`
  `"Urantia|urantia"`
- `node --import tsx --test test/public-api-registry.test.ts`
  `--test-name-pattern "Urantia|urantia"`
- `node --import tsx --test test/endpoint-catalog.test.ts`
  `--test-name-pattern "Urantia|urantia"`
- `node --import tsx --test test/contract/json-rpc.test.ts`
  `--test-name-pattern "Urantia|urantia"`
- direct CLI info/help, runtime text/JSON, invalid-argument, empty-state,
  boundary, endpoint, media-boundary, and content-boundary probes
- online `--persist` and offline replay with isolated `PUBLIC_APIS_HOME_DIR`
- `PUBLIC_APIS_LIVE_E2E=1 node --import tsx --test`
  `test/live-api/urantia.test.ts`
- `npm run lint`
- `npm run typecheck`
- `npm run spec:validate`
- `npm run build:tarball`
- `npm run package:verify`
- `npm run quality:check` with lint, typecheck, spec validation, full test,
  and contract stages passing
- full test stage within `quality:check` with 1305 passing unit tests
- contract stage within `quality:check` with 194 passing contract tests
- `git diff --check`
- added-line width scan for touched files
- targeted secret scan over the current diff

## 残余不确定（Residual Uncertainty）

`llms.txt` documents 100 requests/minute/IP, while live headers reported
`x-ratelimit-limit: 200`. Provider metadata records both. Runtime availability
remains dependent on the unauthenticated public service and Cloudflare edge
behavior. The provider now fails clearly if future challenge HTML appears, and
cached/offline replay remains available for previously persisted requests.

## 参考（References）

- `evidence_1c4ddf7b393f4e63934a27595f81caf7`
- `evidence_49b3b9255e1948fc80e2c04875504a76`
- `evidence_d33a3c103455423dbd4bc6a311e43ea1`
- `evidence_8a37a7d1828d47a9a6770395488db043`
