# xMath Provider 开发记录（Development Record）- Blocked

- Provider: xMath
- Category: Science & Math
- Backlog line: 1470
- Catalog URL: `https://x-math.herokuapp.com/`
- Date: 2026-05-12
- Decision: blocked
- Research ID: `research_272b87d7fdd1417392f7f956284dd11a`
- Evidence:
  - `evidence_324c7a02a50b41dd8605019c54d14bad`
  - `evidence_9ba56c86ec8e4a098cc62dc8f0f46e83`
  - `evidence_38cbc0b4266c4645a1dc5c5bc972556c`
  - `evidence_1d77edb158914774ae9a2848fafae8d5`
- Artifact: `artifact_fa95be15e5dd4e688f584c588c2a06b0`

## 结论（Decision）

xMath 当前不能作为 no-auth Tire1.6 Science & Math provider 实现。列出的
Heroku app 仍可 DNS 解析，但所有实际 HTTP/HTTPS 探测都返回 Heroku router
`404 Not Found` 的 `text/html` No such app 页面，而不是 JSON、XML、text
API 或可转换为结构化 JSON 的响应。

## 来源与探测（Sources And Probes）

Public API 目录和镜像只重复同一个 listed host：

- `https://x-math.herokuapp.com/`
- `https://publicapis.io/xmath-api`
- `https://api.allworlddata.com/science-and-mathematics/158-xmath.html`

直接探测覆盖：

- `https://x-math.herokuapp.com/`
- `https://x-math.herokuapp.com/random/math`
- `https://x-math.herokuapp.com/api`
- `https://x-math.herokuapp.com/api/random`
- `https://x-math.herokuapp.com/api/random-expression`
- `https://x-math.herokuapp.com/random`
- `https://x-math.herokuapp.com/random-expression`
- `https://x-math.herokuapp.com/math`
- `https://x-math.herokuapp.com/expression`
- `https://x-math.herokuapp.com/api/v1`
- `https://x-math.herokuapp.com/api/v1/random`
- `https://x-math.herokuapp.com/api/v1/expression`
- `https://x-math.herokuapp.com/swagger.json`
- `https://x-math.herokuapp.com/openapi.json`
- `https://x-math.herokuapp.com/docs`

HTTP variants for `/`, `/random/math`, and `/api/random` were also probed.
Every listed or guessed route returned Heroku router HTTP 404 `text/html`
with the No such app page.

## 边界判断（Boundary Assessment）

No API key、OAuth、account 或 browser clickstream requirement was observed,
but that does not make the provider implementable because no live API surface
exists. Implementing would require stale documentation assumptions, guessed
endpoints, self-hosting, or fabricating a local math generator, all of which
violate the workflow boundary.

No provider code, registry entry, endpoint catalog record, live e2e test, or
offline seed was added.

## 残余不确定（Residual Uncertainty）

A public replacement host or source repository was not found in the observed
public directory pages or targeted searches. If a maintained official xMath
host appears later, it should re-enter the normal no-auth provider workflow
from documentation review and live endpoint probes.
