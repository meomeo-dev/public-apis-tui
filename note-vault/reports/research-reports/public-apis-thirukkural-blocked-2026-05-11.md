# Thirukkural Provider 决策记录（Decision Record）- Blocked

- Provider: Thirukkural
- Category: Books
- Backlog line: 270
- Catalog URL: `https://api-thirukkural.web.app/`
- Date: 2026-05-11
- Decision: blocked
- Research ID: `research_e8f5f50d183849259288cdafd7e97faa`
- Artifact ID: `artifact_1266b788fbb84d5889932a9e63885d12`
- Evidence:
  - `evidence_556a807290cb499d82239c1490ff0ed5`
  - `evidence_a0465592c0a6439e937e2290d3fb0763`

## 工作流边界（Workflow Boundary）

Tire1.6 Books provider 开发要求可复核的无认证（no-auth）结构化 API。
不允许用 HTML sample、stale copied data、guessed replacement host、
scraping 或本地静态数据代替 live public API。

## 官方来源复核（Official Source Review）

任务表列出的 canonical source 是 `https://api-thirukkural.web.app/`。
该 Firebase homepage 当前返回 HTTP 200 `text/html`，并描述 Thirukkural
API 会按 kural number 返回 poem、Tamil explanation 和 English
translation。

该官方页面同时说明旧 Firebase API URL：

- `https://api-thirukkural.web.app/api?num=x`

已计划自 2021-03-15 起退休，并要求 developers 迁移到 Vercel Functions：

- `https://api-thirukkural.vercel.app/api?num={kural_num}`

文档列出的 response fields 包括 `number`、`sect_tam`、`chapgrp_tam`、
`chap_tam`、`line1`、`line2`、`tam_exp`、`sect_eng`、`chapgrp_eng`、
`chap_eng`、`eng` 和 `eng_exp`。

## Live Probe 证据

所有探针均在 2026-05-11 从本仓库环境执行，未发送 API key、OAuth
token、cookie、账户凭据或浏览器会话。

- `GET https://api-thirukkural.vercel.app/api?num=1` 返回 HTTP 402
  `text/plain`，header `x-vercel-error: DEPLOYMENT_DISABLED`。
- `GET https://api-thirukkural.vercel.app/api?num=1330` 返回 HTTP 402
  `text/plain`，同样为 `DEPLOYMENT_DISABLED`。
- `GET https://api-thirukkural.web.app/api?num=1` 返回 HTTP 404
  `text/html` Firebase Page Not Found。
- `GET https://api-thirukkural.web.app/docs` 返回 HTTP 404 `text/html`。

未观察到可重复调用的 live JSON endpoint。

## 决策（Decision）

Mark `Thirukkural` as `blocked` with `auditStatus: n/a`. No provider module,
registry entry, endpoint catalog record, renderer, live e2e test, or offline
seed was added.

## 验证（Validation）

- Official docs and live probes recorded.
- deep-research `gate_check` passed.
- Task table synchronized to `blocked`.
- Runtime CLI audit was not applicable because no implementation artifacts
  were created.
- Live e2e and offline replay were not applicable because the documented live
  JSON deployment is disabled.

## 残余不确定性（Residual Uncertainty）

The published sample JSON on the HTML page may still describe the intended
schema, and the linked GitHub data source may still contain Thirukkural text.
Revisit only if the official Vercel deployment is restored or a current
official no-auth JSON endpoint is published.
