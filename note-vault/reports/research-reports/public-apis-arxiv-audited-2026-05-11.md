# arXiv Provider 审计记录（Audit Record）- Audited

- Provider: arXiv
- Category: Science & Math
- Catalog URL: `https://arxiv.org/help/api/user-manual`
- Date: 2026-05-11
- Decision: audited
- Provider ID: `arxiv`
- Operations: `arxiv.search`, `arxiv.paper`
- Research ID: `research_6cea343fea87492ea24b8052274a3d17`

## 结论（Decision）

arXiv provider 通过 command-driven runtime/TUI audit。实现继续暴露
`GET https://export.arxiv.org/api/query` 的 no-auth Atom metadata surface，
并只投影论文 metadata、abstract 摘要和 official arXiv URLs。PDF 下载、
HTML scraping、browser clickstream、account workflow、upload/delete/share
workflow、binary payload 和 base64 payload 均不暴露。

审计期间观察到一次 transient upstream HTTP 429 `Rate exceeded.`
`text/html` 响应。该响应未被当作业务数据；客户端已补充
provider-specific rate-limit error，明确提示 retry later 或使用 cached /
offline data。按 arXiv 文档中的重复调用间隔退避后，同一 endpoint
恢复
HTTP 200 `application/atom+xml`，后续 runtime audit、persistence replay 和
live e2e 均通过。

## Runtime Audit

实际执行并观察：

- `npx tsx src/cli.ts apis info arxiv --format text`
- `npx tsx src/cli.ts apis info arxiv --format json`
- `npx tsx src/cli.ts apis run arxiv.search --help`
- `npx tsx src/cli.ts apis run arxiv.paper --help`
- `npx tsx src/cli.ts apis run arxiv.search --format text --`
  `--query 'id:2101.00001' --max-results 1 --summary-length 120`
- `npx tsx src/cli.ts apis run arxiv.search --format json --`
  `--query 'id:2101.00001' --max-results 1 --summary-length 120`
- `npx tsx src/cli.ts apis run arxiv.paper --format text --`
  `--id 2101.00001 --summary-length 120`
- `npx tsx src/cli.ts apis run arxiv.paper --format json --`
  `--id 2101.00001 --summary-length 120`
- invalid probes for `--max-results 101`, `--category bad/category`, and
  `--id 'not valid id'`
- offline miss probe before cache seed
- online `--persist` followed by offline replay for both operations with an
  isolated `PUBLIC_APIS_HOME_DIR`

Representative outputs showed provider identity, endpoint, storage mode, open
REST/no-auth/no Chrome clickstream boundary, Atom-to-JSON transport, query,
count/pagination, rate note, paper title, authors, abstract summary, abs URL,
PDF URL, and next commands. Text output did not dump binary, PDF bytes, base64,
HTML pages, warning pages, or raw Atom XML.

## Direct Endpoint Probes

Direct probes covered:

- `GET https://export.arxiv.org/api/query?search_query=all%3Aelectron`
  initially returned HTTP 429 `text/html` with body `Rate exceeded.`
- `GET https://info.arxiv.org/help/api/user-manual.html` returned HTTP 200
  `text/html` documentation content.
- `GET https://arxiv.org/` returned HTTP 200 `text/html` homepage content.
- After delay, `GET https://export.arxiv.org/api/query?search_query=id%3A`
  `2101.00001&start=0&max_results=1` returned HTTP 200
  `application/atom+xml; charset=utf-8` with one Atom entry.

No Cloudflare challenge, CAPTCHA, JavaScript redirect shell, parked-domain
page, gateway interstitial, credential requirement, or cookie/session flow was
observed. The only abnormal endpoint response was the documented-style rate
limit body, now surfaced as a clear provider-specific runtime failure.

## 修复（Fix）

Updated `src/infrastructure/openApis/arxivClient.ts` so upstream HTTP 429 or
`Rate exceeded.` responses throw:

- code: `OPEN_API_FAILED`
- message: arXiv API is currently rate limiting this runtime
- details: provider id, HTTP status, status text, and content type

Updated `test/arxiv-client.test.ts` with a regression test that feeds the
representative HTTP 429 `text/html` body into the client and asserts the clear
provider-specific error.

## 验证（Validation）

Passed:

- `node --import tsx --test test/arxiv-client.test.ts`
- targeted arXiv registry/output tests with 227 passing selected tests
- `npm run lint`
- `npm run typecheck`
- `npm run spec:validate`
- `npm run test:contract` with 194 passing tests
- `npm run build`
- `npm run package:verify`
- `PUBLIC_APIS_LIVE_E2E=1 node --import tsx --test`
  `test/live-api/arxiv.test.ts` with 2 passing tests
- split `test/*.test.ts` batches excluding the known monolithic
  `test/cli-program.test.ts` subprocess-heavy file, all passed
- `git diff --check`
- targeted secret scan for token-like assignments in source, tests, task
  records, and research reports

`npm run quality:check` reached `npm run test` without assertion failures but
timed out at the shell wrapper after 900 seconds. A broad isolated
`test/cli-program.test.ts` pattern also timed out because that file launches
many synchronous CLI help subprocesses. Direct arXiv help, info, run, live e2e,
targeted registry/output, contract, build, and package gates passed.

## 残余不确定（Residual Uncertainty）

arXiv enforces runtime rate limiting from this environment. The provider now
surfaces the condition clearly and the live e2e passes when calls are spaced
according to the documented repeated-call delay, but future audits may need
the same delay discipline or cached/offline replay during temporary upstream
429 windows.
