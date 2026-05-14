# Russian Calendar Provider 开发决策（Development Decision）- Blocked

- Provider: Russian Calendar
- Category: Calendar
- Backlog line: 326
- Catalog URL: `https://github.com/egno/work-calendar`
- Date: 2026-05-11
- Decision: blocked
- Research ID: `research_5afcdece686d451cba1d72e2f7768572`
- Artifact ID: `artifact_7aa42d84c7e249589a39cc43cefacf15`
- Evidence:
  - `evidence_24173b85edac4df3ab6e82767b051729`
  - `evidence_6aae5da20ea64aa3baf993178b3b3020`
  - `evidence_c5cbf152291b42fa9222cd6c2713b19b`
  - `evidence_da5a0cb835fb40b2bf22df64b66d7f00`
  - `evidence_349185069f7443e486a185e5a5f21a70`
  - `evidence_6742289a69bd4f2f8c9189630c88c9f9`

## 工作流边界（Workflow Boundary）

Tire1.6 Calendar provider 开发要求可复核的无认证（no-auth）公共
API。实现必须调用稳定的 HTTPS JSON、XML、ICS 或可安全解析的文本
API，不能依赖自托管（self-hosting）、猜测部署地址、HTML scraping
或 browser clickstream。

## 官方来源复核（Official Source Review）

官方仓库 `egno/work-calendar` 是 archived GitHub repository，没有发布
homepage。GitHub metadata 显示仓库最后更新停留在 2021 年，license 为
LGPL-3.0。

README 将项目描述为 work calendar service，是作者 Smart Home 的一部分。
文档示例使用 `https://my_host/calendar/day/` 和
`https://my_host/calendar/day/2018-06-09/` 占位地址，并要求用户通过
Docker 或 docker-compose 运行服务。README 还描述
`https://my_host/calendar/update/` 会请求 data.gov.ru 更新数据，但没有
公布可供 CLI 直接调用的公共 hosted API base URL。

源码中的 Flask routes 只定义自部署服务路径：`/day/`、
`/day/<string:day>/` 和 `/update/`。`/update/` 会更新本地 calendar
data，不是只读公共 API。数据获取源码通过 data.gov.ru 页面查找最新
数据集链接后下载 CSV，这属于 HTML-derived update flow，不是稳定
文档化 API。

## Live Probe 证据

所有探测均在 2026-05-11 从本仓库环境执行，未发送 API key、OAuth
token、cookie、账户凭据或浏览器会话。

- `GET https://api.github.com/repos/egno/work-calendar` 返回 HTTP 200
  JSON，确认 `archived: true`、`homepage: null`、last push 为
  `2021-03-31T13:02:43Z`。
- `GET https://raw.githubusercontent.com/egno/work-calendar/master/README.md`
  返回 HTTP 200 `text/plain`，确认文档仅提供 `my_host` 自部署示例。
- `GET http://data.gov.ru/opendata/7708660670-proizvcalendar` 返回
  empty reply；HTTPS probe 在本运行环境中 TLS negotiation failed。
- `GET https://egno.github.io/work-calendar/calendar/day/2018-06-09/`
  返回 HTTP 404 `text/html` GitHub Pages page-not-found HTML。
- 本地 `localhost:8111` 没有运行可复用服务；该项目需要自托管。

## 风险与边界评估（Risk and Boundary Assessment）

- No-auth API usability: failed；没有稳定公共 hosted API。
- Live JSON readiness: failed；可验证路径不是 JSON API endpoint。
- Self-hosting dependency: present；README 明确要求 Docker deployment。
- Scraping risk: present；update flow 从 data.gov.ru HTML 派生 CSV link。
- Mutating behavior: present in `/update/`；该 route 会更新本地数据。
- Implementation risk: high；实现 would require rehosting, guessed endpoint,
  stale assumptions, or HTML scraping.
- Browser/clickstream risk: not used；没有浏览器绕过或 clickstream。

## 决策（Decision）

将 `Russian Calendar` 标记为 blocked，`auditStatus` 保持 `n/a`。不添加
provider module、registry entry、endpoint catalog record、renderer、
live e2e test 或 offline seed。

## 验证（Validation）

- 已记录仓库 metadata、README、自部署 route、data.gov.ru update flow、
  live probe 和 GitHub Pages 404 证据。
- deep-research gate check 通过，research lifecycle 已完成为 `completed`。
- 未执行 runtime CLI audit，因为没有创建实现工件。
- live e2e 与 offline replay 不适用，因为 provider 当前没有 live
  no-auth public API endpoint。
- 任务表同步为 `blocked` 后执行 `git diff --check` 和报告行宽检查。

## 残余不确定性（Residual Uncertainty）

如果维护者重新发布官方 hosted API，或 data.gov.ru 提供稳定可复核的
公共机器接口，可重新评估。重新评估时仍应确认 endpoint contract、
content-type、read-only boundary、live e2e、offline replay 和
HTML-as-data handling。
