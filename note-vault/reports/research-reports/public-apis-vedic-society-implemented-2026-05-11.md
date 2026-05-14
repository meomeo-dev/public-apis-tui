# Vedic Society Provider 开发记录（Development Record）- Implemented

- Provider: Vedic Society
- Category: Books
- Backlog line: 272
- Catalog URL: `https://aninditabasu.github.io/indica/html/vs.html`
- Current docs URL: `https://aninditabasu.github.io/indica/topics/api_vs.html`
- Date: 2026-05-11
- Decision: implemented
- Provider ID: `vedicsociety`
- Operations:
  - `vedicsociety.words`
  - `vedicsociety.descriptions`
  - `vedicsociety.category`
- Research ID: `research_3b1fe326cb8c483e8dcfcc9faf846ee8`
- Artifact ID: `artifact_b177e9f285234d1d9674632ed604d4f4`
- Evidence:
  - `evidence_47970aec11fd42629735408987d4ba4e`
  - `evidence_ec9d4eac39834896acc2526d560449ce`
  - `evidence_1aa9d88b64e84e43b51c021dec79fe0e`
  - `evidence_069c4d0e46c2456d94ffdcb9a03a15ce`

## 工作流边界（Workflow Boundary）

Tire1.6 Books provider 开发要求可复核的无认证（no-auth）结构化公共
API。Vedic Society provider 只暴露 read-only noun metadata。实现排除
HTML warning payloads、browser scraping、Chrome clickstream、arbitrary path
proxying、upload/delete/share workflow、binary payload 和 base64 payload。

## 官方来源复核（Official Source Review）

任务表列出的 `https://aninditabasu.github.io/indica/html/vs.html` 已经
返回 404。当前同项目文档位于：

- `https://aninditabasu.github.io/indica/topics/api_vs.html`
- `https://aninditabasu.github.io/indica/assets/openapi_vs.json`

当前文档和 OpenAPI JSON 均返回 HTTP 200。OpenAPI JSON 描述 Vedic Society
v2 read-only GET routes：

- `GET /words/{word}`
- `GET /descriptions/{description}`
- `GET /categories/{category}`

API base 是 `https://indica-1hwj.onrender.com/vs/v2`。选定路由没有
API key、OAuth、cookie、account setup、browser session 或 Chrome
clickstream 要求。

## Live Probe 证据

所有探测均在 2026-05-11 从本仓库环境执行，未发送 API key、OAuth
token、cookie、账户凭据或浏览器会话。

- Docs page returned HTTP 200 `text/html; charset=utf-8`.
- OpenAPI JSON returned HTTP 200 `application/json; charset=utf-8`.
- `GET /words/agni` returned HTTP 200 `application/json`.
- `GET /categories/river` returned HTTP 200 `application/json`.
- `GET /descriptions/fire` returned JSON noun records during CLI audit.
- Known not-found text is mapped to an empty result.
- Invalid category warning HTML/text is blocked by local enum validation.

## 实现（Implementation）

新增 `VedicSocietyClient`，使用 `fetch` 调用官方 REST base：
`https://indica-1hwj.onrender.com/vs/v2`。

新增 usecase 层：

- `vedicsociety.words`：default word `agni`.
- `vedicsociety.descriptions`：default description `fire`.
- `vedicsociety.category`：default category `river`.

所有 operation 支持本地 `limit` 和 `offset` 分页。`limit` default 是
20，cap 是 100；`offset` cap 是 20000。`word` 和 `description` 拒绝
slash、query、fragment、control character 和空字符串。`category` 使用
官方文档枚举，避免把 invalid-category warning payload 当作数据。

Text renderer 显示 operation identity、endpoint、storage mode、open REST、
no-auth/no Chrome clickstream boundary、transport、query、pagination、
scope、category policy、empty policy、facets、records、online persist
command、offline replay command 和 related navigation command。

## Runtime Audit

实际执行并观察：

- `node dist/src/cli.js apis info vedicsociety --format text`
- `node dist/src/cli.js apis run vedicsociety.words --format text --`
  `--word agni --limit 2`
- `node dist/src/cli.js apis run vedicsociety.category --format json --`
  `--category river --limit 2`
- `npx tsx src/cli.ts apis run vedicsociety.words --help`
- `npx tsx src/cli.ts apis run vedicsociety.descriptions --help`
- `npx tsx src/cli.ts apis run vedicsociety.category --help`
- `PUBLIC_APIS_LIVE_E2E=1 NODE_NO_WARNINGS=1 node --import tsx --test`
  `test/live-api/vedicsociety.test.ts`

Runtime audit covered provider info、operation help、representative text、
representative JSON、invalid category/limit input、online `--persist`、offline
replay 和 direct live endpoint probes。未观察到 HTML-as-data、gateway page、
warning-as-data、base64 dump、binary payload、credential flow、account flow、
upload/delete/share workflow 或 browser clickstream。

## 测试与验证（Validation）

新增或更新：

- `src/infrastructure/openApis/vedicSocietyClient.ts`
- `src/application/usecases/vedicSociety.ts`
- `src/providers/vedicsociety/index.ts`
- `test/vedicsociety-client.test.ts`
- `test/live-api/vedicsociety.test.ts`
- renderer、registry、endpoint catalog、CLI help 和 JSON-RPC tests。

已执行并通过：

- `npm run typecheck`
- targeted Vedic Society client/output/registry/catalog tests
- targeted JSON-RPC tests for Vedic Society and registry surfaces
- `npm run lint`
- `npm run spec:validate`
- `git diff --check`
- gated live e2e with `PUBLIC_APIS_LIVE_E2E=1`
- `npm run build`
- `npm run test:contract`
- `npm run package:verify`

`test/cli-program.test.ts --test-name-pattern 'Vedic Society'` 在本地两次
因为该文件大量 spawn help subprocess 而超时；直接执行三个 Vedic Society
help commands 均成功，作为 CLI help audit evidence。

## 残余不确定（Residual Uncertainty）

Vedic Society 当前 live service 位于 Render host，公开文档未声明 rate limit
或 SLA。Provider 因此保持 bounded defaults，不做 bulk crawling，不暴露任意
path proxy，并将 unsupported category 在本地拦截。
