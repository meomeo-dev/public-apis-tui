# Quran Provider 开发决策（Development Decision）- Blocked

- Provider: Quran
- Category: Books
- Backlog line: 264
- Catalog URL: `https://quran.api-docs.io/`
- Date: 2026-05-11
- Decision: blocked
- Research ID: `research_5291dc3e386f48a78f29cfdc7f7a67a5`
- Artifact ID: `artifact_b802054ffdd94c7ba865e0f7ccafb41c`
- Evidence:
  - `evidence_4c434716670b458192dc5c9280d3e06d`
  - `evidence_70b94543314b452fabb7974274bb71aa`
  - `evidence_7be06a1d647343ec90660e946fc09921`
  - `evidence_b722ab5a82f14833a6bec9b637e70119`

## 工作流边界（Workflow Boundary）

Tire1.6 Books provider 开发要求可复核的无认证（no-auth）结构化 API。
Provider 不得依赖 API key、OAuth、账户、cookie、浏览器点击流
（browser clickstream）、隐藏会话或凭据绕过。

## 官方来源复核（Official Source Review）

任务表列出的 `https://quran.api-docs.io/` 不再承载 Quran 专属文档。
现场探测显示该 URL 先重定向到 `www.api-docs.io`，再到
`api-docs.io`，最终返回通用 Stoplight API Docs 首页 HTML。

当前可定位的官方 Quran.Foundation / Quran.com 文档是 Content API
v4。该文档明确把 Content APIs 放在 OAuth2 访问模型下：开发者需要
获取 access token，并在资源请求中发送 `x-auth-token` 与
`x-client-id` 头。这与本轮 no-auth backlog 的入口条件冲突。

## Live Probe 证据

所有探测均在 2026-05-11 从本仓库环境执行，未发送 API key、OAuth
token、cookie、账户凭据或浏览器会话。

- `GET https://quran.api-docs.io/` 返回重定向链，最终为通用
  `api-docs.io` HTML 页面，不是 Quran API 文档。
- `GET https://api-docs.quran.foundation/docs/category/content-apis-4.0.0`
  返回 Quran.Foundation Content API v4 文档入口。
- Content API introduction 页面说明资源访问需要 OAuth2 access token、
  `x-auth-token` 和 `x-client-id`。
- `GET https://api.quran.com/api/v4/chapters?language=en` 返回 HTTP 200
  `application/json`。
- `GET https://api.quran.com/api/v4/verses/by_chapter/1?...` 返回 HTTP 200
  `application/json`，并包含 translation text。
- `GET https://api.quran.com/api/v4/resources/translations?language=en`
  返回 HTTP 200 `application/json`。
- `GET https://api.quran.com/content/api/v4/chapters?language=en` 返回
  HTTP 404 `text/html`。
- `GET https://quranapi.azurewebsites.net/api/` DNS 解析失败：
  `Could not resolve host`。

## 风险与边界评估（Risk and Boundary Assessment）

- No-auth API usability: failed；当前官方文档要求 OAuth2/API headers。
- Listed docs usability: failed；列出的 `quran.api-docs.io` 已退化为通用
  API Docs 首页。
- Historical host usability: failed；旧 Azure API 主机不可解析。
- Undocumented compatibility risk: present；裸 `api.quran.com/api/v4`
  端点虽然返回 JSON，但官方当前文档不把它声明为 no-auth contract。
- Browser/clickstream risk: not used；没有尝试浏览器绕过或 clickstream。
- Books safety: 未发现内容安全阻塞；认证边界已足以阻塞本轮
  工作流。

## 决策（Decision）

将 `Quran` 标记为 blocked，`auditStatus` 保持 `n/a`。不添加 provider
module、registry entry、endpoint catalog record、renderer、live e2e test
或 offline seed。

## 验证（Validation）

- 已记录列出 URL、官方 Content API 文档、裸 API 探测和旧主机
  DNS 失败。
- 未执行 runtime CLI audit，因为没有创建实现工件。
- live e2e 与 offline replay 不适用，因为该 provider 不能作为
  documented no-auth API 暴露。
- 任务表同步为 `blocked` 后执行 `npm run spec:validate`、
  `git diff --check` 和报告行宽检查。

## 残余不确定性（Residual Uncertainty）

Quran.Foundation / Quran.com 可能在 future keyed-provider workflow 中可用。
后续若要实现，应按 keyed provider 处理 OAuth2/client credentials、本地
secret config、secret redaction、quota/terms 说明和产品审批。
