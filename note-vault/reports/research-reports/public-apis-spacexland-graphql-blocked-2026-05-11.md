# SpaceXLand GraphQL Provider 研究记录（Decision Record）- Blocked

- Provider: SpaceX
- Category: Science & Math
- Backlog line: 1463
- Catalog URL: `https://api.spacex.land/graphql/`
- Date: 2026-05-11
- Decision: blocked
- Provider ID: n/a
- Operations: n/a
- Research ID: `research_549939e27ad54a639a57b047b9eafa33`
- Artifact ID: `artifact_09153d2339904132a312fb4d026480b7`
- Evidence:
  - `evidence_922dec788e374365a159e721843a9734`
  - `evidence_9ed2ae4d01e141739091a4e5fa93b114`

## 工作流边界（Workflow Boundary）

Tire1.6 Science & Math provider 开发要求可复核的无认证（no-auth）
结构化公共 API。GraphQL provider 也必须通过 live endpoint 验证，能够
支持 repeatable live e2e、online `--persist` 和 offline replay。

本条任务不同于前一条 r-spacex REST provider。前一条 REST provider
已经以 `spacex` 实现；本条只判断 listed SpaceXLand GraphQL host。

## 官方来源复核（Official Source Review）

SpaceXLand API repository README 文档说明 GraphQL endpoint 是
`https://api.spacex.land/graphql`，REST endpoint 是
`https://api.spacex.land/rest`。同一 README 也标注项目
`Not maintained`。

该 source 可以证明历史 intent，但不能替代当前 live API 验证。

## Live Probe 证据

所有探测均在 2026-05-11 从本仓库环境执行，未发送 API key、OAuth
token、cookie、账户凭据或浏览器会话。

- `curl https://api.spacex.land/graphql/` 失败：
  `Could not resolve host: api.spacex.land`。
- `curl https://api.spacex.land/rest` 失败：
  `Could not resolve host: api.spacex.land`。
- `dig +short api.spacex.land` 未返回地址记录。
- `nslookup api.spacex.land 1.1.1.1` 返回 NXDOMAIN。
- Node `dns.lookup("api.spacex.land")` 返回 ENOTFOUND。

因此无法获得 GraphQL JSON、schema introspection、company、ships、
launchpads 或 launches data。

## 决策（Decision）

Mark `SpaceX` GraphQL as `blocked` with `auditStatus` `n/a`。不添加
provider code、registry entry、endpoint catalog record、live e2e 或
offline seed。

实现该 provider 将需要 stale docs assumption、未列入任务的 replacement
host、self-hosting，或重复使用已实现的 r-spacex REST provider。这些路径
均不满足本工作流对 repeatable live no-auth public API 的要求。
