# INSPIRE HEP Provider 审计记录（Audit Record）- Audited

- Provider: INSPIRE HEP
- Category: Science & Math
- Catalog URL: `https://github.com/inspirehep/rest-api-doc`
- Date: 2026-05-11 UTC
- Decision: audited
- Provider ID: `inspirehep`
- Operations: `inspirehep.search`, `inspirehep.record`
- Research ID: `research_87c0b299b042422b889a6ac00ff2a2ed`
- Artifact: `artifact_ac1507e93f2743148e5d30b965c222af`

## 结论（Decision）

INSPIRE HEP provider 通过 command-driven runtime/TUI audit。实现继续暴露
documented HTTPS JSON REST endpoints：

- `GET https://inspirehep.net/api/literature`
- `GET https://inspirehep.net/api/literature/{recid}`

CLI 只使用 read-only GET JSON literature metadata operations。Bibliography
generation POST、BibTeX/LaTeX/CV rendering、generated downloads、arbitrary
record-type proxying、author email harvesting、browser scraping、browser
clickstream、upload/delete/share workflows、binary/base64 payloads 和
HTML-as-data 均不暴露。

审计期间未观察到 Cloudflare challenge、CAPTCHA、gateway interstitial、
JavaScript redirect shell、parked-domain page、credential prompt 或
HTML-as-data。为满足 challenge regression guardrail，客户端已补充
provider-specific Cloudflare challenge HTML detection；未来 403/429
challenge HTML 会抛出明确 `OPEN_API_FAILED`，提示 retry later 或使用
cached/offline data，而不是普通 JSON parse failure。

审计还发现 blank optional query/sort parameters 会先被 Zod schema 打成
raw validation JSON。Provider schema 已调整为允许空字符串进入 INSPIRE
HEP normalizer，由 normalizer 修剪并回退到 documented defaults，避免对
终端用户暴露底层 schema JSON。

## Runtime Audit

实际执行并观察：

- `node --import tsx src/cli.ts apis info inspirehep`
- `node --import tsx src/cli.ts apis run inspirehep.search --help`
- `node --import tsx src/cli.ts apis run inspirehep.record --help`
- `node --import tsx src/cli.ts apis run inspirehep.search --format text --`
  `--query higgs --sort mostrecent --limit 2 --abstract-length 180`
- `node --import tsx src/cli.ts apis run inspirehep.search --format json --`
  `--query higgs --sort mostcited --limit 2 --page 2`
  `--abstract-length 120`
- `node --import tsx src/cli.ts apis run inspirehep.record --format text --`
  `--recid 4328 --abstract-length 180`
- `node --import tsx src/cli.ts apis run inspirehep.record --format json --`
  `--recid 4328 --abstract-length 0`
- invalid probes for `--limit 51`, `--page 401`, `--sort relevance`,
  `--recid 0`, blank `--query`, and blank `--sort`
- online `--persist` followed by offline replay for both operations with an
  isolated `PUBLIC_APIS_HOME_DIR`

Representative outputs showed provider identity, endpoint, storage mode,
HTTPS JSON REST transport, open API/no-auth/no Chrome clickstream boundary,
query, pagination, rate policy, metadata terms, papers, authors, publication,
arXiv/DOI identifiers, citation counts, abstracts, record links, citation
links, and next commands. Text output did not dump generated bibliography
formats, raw full payloads, HTML pages, warning pages, binary data, image
bytes, or base64 data.

## Direct Endpoint Probes

Direct probes covered:

- `GET https://github.com/inspirehep/rest-api-doc` returned HTTP 200
  `text/html`.
- `GET https://inspirehep.net/api/literature?q=higgs&sort=mostrecent&size=1`
  returned HTTP 200 `application/json`.
- `GET https://inspirehep.net/api/literature/4328` returned HTTP 200
  `application/json`.
- `GET https://inspirehep.net/api/literature?q=...unlikely...&size=1`
  returned HTTP 200 `application/json` with zero hits.
- `GET https://inspirehep.net/api/literature/99999999` returned HTTP 404
  `application/json` with a provider message.
- `GET https://inspirehep.net/api/literature/4328?format=bibtex` returned
  HTTP 200 `application/x-bibtex` and remains outside the exposed CLI
  boundary.

The exposed API routes returned normal JSON metadata. No `cf-mitigated`
challenge header, Cloudflare challenge HTML, CAPTCHA page, JavaScript
redirect shell, parked-domain page, or gateway interstitial was observed.

## 修复（Fix）

Updated `src/infrastructure/openApis/inspireHepClient.ts` so response bodies
are read as text before JSON parsing. The client now detects representative
Cloudflare/challenge signals:

- `cf-mitigated: challenge`
- HTTP 403/429 `text/html`
- Cloudflare server header
- `Just a moment...` challenge title

Detected challenges throw:

- code: `OPEN_API_FAILED`
- message: INSPIRE HEP is returning a Cloudflare challenge HTML page
- details: provider id, HTTP status, status text, content type, and URL

Updated `test/inspirehep-client.test.ts` with a regression test that feeds
`cf-mitigated: challenge` and `Just a moment...` HTML into the client and
asserts a clear provider-specific error.

Updated `src/providers/inspirehep/index.ts` so optional `query` and `sort`
parameters are validated by the provider normalizer. Blank optional text now
maps to the documented defaults instead of leaking raw Zod validation JSON.

## 验证（Validation）

Passed:

- `node --import tsx --test test/inspirehep-client.test.ts`
- `node --import tsx --test test/cli-output.test.ts --test-name-pattern`
  `"INSPIRE HEP"`
- `node --import tsx --test test/public-api-registry.test.ts`
  `--test-name-pattern "inspirehep|INSPIRE HEP"`
- `node --import tsx --test test/contract/json-rpc.test.ts`
  `--test-name-pattern "INSPIRE HEP|inspirehep"`
- direct CLI info and help commands for both operations
- online `--persist` and offline replay for both operations with isolated
  `PUBLIC_APIS_HOME_DIR`
- direct endpoint probes for docs, search, record, empty search, missing
  record, and BibTeX boundary
- `PUBLIC_APIS_LIVE_E2E=1 node --import tsx --test`
  `test/live-api/inspirehep.test.ts`
- `npm run lint`
- `npm run typecheck`
- `npm run spec:validate`
- `npm run build`
- `npm run package:verify`
- `npm run quality:check` with lint, typecheck, spec validation, full test,
  and contract stages passing
- full `npm run test` within `quality:check` with 1284 passing tests
- `npm run test:contract` within `quality:check` with 194 passing tests
- `git diff --check`
- targeted secret scan for INSPIRE HEP source and tests

## 残余不确定（Residual Uncertainty）

INSPIRE HEP search results depend on upstream service availability and
metadata freshness. The provider now fails clearly if future WAF/challenge
HTML appears, and cached/offline replay remains available for previously
persisted requests.
