# Remote Calc Provider 开发决策（Development Decision）- Blocked

- Provider: Remote Calc
- Category: Science & Math
- Backlog line: 1460
- Catalog URL: `https://github.com/elizabethadegbaju/remotecalc`
- Date: 2026-05-11
- Decision: blocked
- Research ID: `research_30228491749c45f09c05944d4a77cafb`
- Artifact ID: `artifact_1b5deec3219b470cac10b95cab4da5a7`
- Evidence:
  - `evidence_05a975317a5540d98513f2227d42a781`
  - `evidence_c223de44c7ca4e2fbb33929734b86222`
  - `evidence_c8e941eebfb84c65a6cd4415d393f629`

## 工作流边界（Workflow Boundary）

Tire1.6 Science & Math provider 开发要求可复核的无认证（no-auth）
结构化 API。Science & Math provider 还必须排除任意代码执行
（arbitrary code execution）、不安全代理、二进制渲染、base64 dump
和 warning-as-data。

## 官方来源复核（Official Source Review）

官方 GitHub README 描述 Remote Calc 是 Python/Django calculator service。
文档定义 `GET /calculus?query=[input]`，其中 `query` 是 UTF-8 base64
编码的算式。成功响应为 JSON `{ "error": false, "result": ... }`，
错误响应为 JSON `{ "error": true, "message": "string" }`。文档声明
支持的运算符为 `+ - * / ( )`，并声明 Heroku 部署地址为
`https://remote-calc.herokuapp.com/`。

源码复核显示 `api/views.py` 解码 base64、删除空白、过滤非数字和
`+ - * / ( )` 以外的字符，并通过自写解释器计算表达式。该源码未
使用 Python `eval` 或 `exec`。因此任意代码执行风险低于通用
expression evaluator，但部署可用性仍是必要门槛。

## Live Probe 证据

所有探测均在 2026-05-11 从本仓库环境执行，未发送 API key、OAuth
token、cookie、账户凭据或浏览器会话。

- `GET https://remote-calc.herokuapp.com/` 返回 HTTP 404 `text/html`
  Heroku router `No such app` 页面。
- `GET https://remote-calc.herokuapp.com/calculus?query=MSsx` 返回
  HTTP 404 `text/html` Heroku router `No such app` 页面。
- `GET http://remote-calc.herokuapp.com/` 返回 HTTP 404 `text/html`
  Heroku router `No such app` 页面。
- `GET http://remote-calc.herokuapp.com/calculus?query=MSsx` 返回
  HTTP 404 `text/html` Heroku router `No such app` 页面。
- 官方仓库 `HEAD` 可访问，`git ls-remote` 返回 commit
  `ef90737a67901bfe07e0a74c32686b5cacfcdc01`。

## 风险与边界评估（Risk and Boundary Assessment）

- No-auth API usability: failed；官方部署已下线。
- Live JSON readiness: failed；可调用 URL 返回 Heroku HTML 404。
- Arbitrary code execution risk: not observed in source；源码过滤字符且
  未使用 `eval`/`exec`。
- Base64 risk: manageable only if service were live；当前没有 JSON API。
- Implementation risk: high；实现 would require rehosting, local emulation,
  or code-derived behavior instead of consuming a public API.
- Browser/clickstream risk: not used；没有浏览器绕过或 clickstream。

## 决策（Decision）

将 `Remote Calc` 标记为 blocked，`auditStatus` 保持 `n/a`。不添加
provider module、registry entry、endpoint catalog record、renderer、
live e2e test 或 offline seed。

## 验证（Validation）

- 已记录 README、源码、部署探测和 Heroku 404 HTML 证据。
- 未执行 runtime CLI audit，因为没有创建实现工件。
- live e2e 与 offline replay 不适用，因为 provider 当前没有 live
  no-auth JSON endpoint。
- 任务表同步为 `blocked` 后执行 `npm run spec:validate`、
  `git diff --check` 和报告行宽检查。

## 残余不确定性（Residual Uncertainty）

如果原维护者恢复 Heroku 部署或发布新的官方 endpoint，可重新
评估。
重新评估时仍应确认表达式边界、超时、division-by-zero behavior、
HTML/error-as-data handling、live e2e 和 offline replay。
