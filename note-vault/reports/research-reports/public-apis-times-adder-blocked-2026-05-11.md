# Times Adder Provider 决策记录（Decision Record）- Blocked

- Provider: Times Adder
- Category: Science & Math
- Backlog line: 1465
- Catalog URL: `https://github.com/FranP-code/API-Times-Adder`
- Date: 2026-05-11
- Decision: blocked
- Research ID: `research_b576a8ccfa31439fb9d5f475da7976cd`
- Artifact ID: `artifact_3efd4d998739490dae7918b4b0a2b3dc`
- Evidence:
  - `evidence_1b6048018d344ea18d687ff9318747ed`
  - `evidence_5501b344166f467f83269cf14b5a7a09`

## 工作流边界（Workflow Boundary）

Tire1.6 Science & Math provider 开发要求 live public API，而不是自托管
源码、local emulation、guessed deployment 或 stale endpoint assumption。
Science & Math provider 也必须排除 arbitrary code execution 和 unsafe
proxying 风险。

## 官方来源复核（Official Source Review）

任务表列出的 canonical source 是 GitHub repository：
`https://github.com/FranP-code/API-Times-Adder`。

Official README documents:

- `POST https://api-times-adder.up.railway.app/api/v1`
- JSON body shape `{ "data": [...] }`
- supported time formats `HH:MM:SS`, `MM:SS`, and `MM`
- maximum array length 200

GitHub repository metadata lists the same Railway URL as homepage.

Source review found an Express app mounted at `/api/v1`. The route parses
colon-delimited strings with `split`, `isNaN`, and `parseInt`; no `eval`,
`exec`, shell, proxying, file upload, or credential flow was observed. This
source review does not satisfy the live API requirement by itself.

## Live Probe 证据

所有探针均在 2026-05-11 从本仓库环境执行，未发送 API key、OAuth
token、cookie、账户凭据或浏览器会话。

- `POST https://api-times-adder.up.railway.app/api/v1` with JSON data
  returned HTTP 404 `application/json` from `railway-edge`.
- Response body included `message: Application not found`.
- Response headers included `x-railway-fallback: true`.
- `GET https://api-times-adder.up.railway.app/api/v1` returned the same
  Railway fallback JSON.
- `GET https://api-times-adder.up.railway.app/` returned the same Railway
  fallback JSON.

No live Times Adder API response was available.

## 决策（Decision）

Mark `Times Adder` as `blocked` with `auditStatus: n/a`. No provider module,
registry entry, endpoint catalog record, renderer, live e2e test, or offline
seed was added.

## 验证（Validation）

- Official README, repository metadata, package, and route source reviewed.
- Live probes to documented Railway deployment recorded.
- deep-research `gate_check` passed.
- Task table synchronized to `blocked`.
- Runtime CLI audit was not applicable because no implementation artifacts
  were created.
- Live e2e and offline replay were not applicable because the documented
  hosted deployment is dead.

## 残余不确定性（Residual Uncertainty）

The repository source could be self-hosted and appears bounded for simple time
addition, but this workflow requires the listed public API to be live. Revisit
only if the official Railway deployment is restored or a current official
no-auth hosted endpoint is published.
