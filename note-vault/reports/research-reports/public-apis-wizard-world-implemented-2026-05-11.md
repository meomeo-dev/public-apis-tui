# Wizard World Provider 开发记录（Development Record）- Implemented

- Provider: Wizard World
- Category: Books
- Backlog line: 273
- Catalog URL: `https://wizard-world-api.herokuapp.com/swagger/index.html`
- Date: 2026-05-11
- Decision: implemented
- Provider ID: `wizardworld`
- Operation: `wizardworld.catalog`
- Research ID: `research_fadb58391f3e43a19815014704766df3`
- Evidence:
  - `evidence_829629c3c3d1430ebe388fd444c158ef`
  - `evidence_2dc9969b07a74f68adc878f320f4d725`
  - `evidence_d1bf3d92f8ec4c46a0f6572c3db678e6`
  - `evidence_d6e0d663e18043289cd838a4fbea236f`

## 工作流边界（Workflow Boundary）

Tire1.6 Books provider 开发要求可复核的无认证（no-auth）结构化公共
API。Wizard World provider 只暴露 Swagger-documented read-only JSON
collections。实现排除 `POST /Feedback`、item detail route proxying、
browser Swagger UI scraping、Chrome clickstream、account workflow、
upload/delete/share workflow、binary payload 和 base64 payload。

## 官方来源复核（Official Source Review）

官方 Swagger UI 和 OpenAPI JSON 均可访问：

- `https://wizard-world-api.herokuapp.com/swagger/index.html`
- `https://wizard-world-api.herokuapp.com/swagger/v1/swagger.json`

OpenAPI JSON 标识 `WizardWorldApi` version `1.1.0`，并列出以下
read-only GET collections：

- `GET /Elixirs`
- `GET /Houses`
- `GET /Ingredients`
- `GET /MagicalCreature`
- `GET /Spells`
- `GET /Wizards`

OpenAPI 同时列出 `POST /Feedback`，该 mutating route 不进入 CLI
contract。选定 GET routes 没有 API key、OAuth、cookie、account setup、
browser session 或 Chrome clickstream 要求。

## Live Probe 证据

所有探测均在 2026-05-11 从本仓库环境执行，未发送 API key、OAuth
token、cookie、账户凭据或浏览器会话。

- OpenAPI JSON returned HTTP 200 `application/json;charset=utf-8`.
- `GET /Spells?Name=Patronus` returned HTTP 200 `application/json`.
- `GET /Elixirs?Name=Felix` returned HTTP 200 `application/json`.
- `GET /Wizards?LastName=Weasley` returned HTTP 200 `application/json`.
- `GET /Spells?Type=INVALID` returned HTTP 400 `application/problem+json`.
- `POST /Feedback` without a body returned HTTP 415 `application/problem+json`.

The CLI locally validates enum filters, so upstream validation errors are
not exposed as ordinary result data.

## 实现（Implementation）

新增 `WizardWorldClient`，使用 `fetch` 调用官方 Heroku API base：
`https://wizard-world-api.herokuapp.com`。

新增 usecase `wizardworld.catalog`，通过 `--resource` 选择 one collection：

- `elixirs`
- `houses`
- `ingredients`
- `creatures`
- `spells`
- `wizards`

CLI exposes curated filters only:

- `--name` for elixirs, ingredients, and spells.
- `--difficulty`, `--ingredient`, `--inventor`, and `--manufacturer`
  for elixirs.
- `--spell-type` and `--incantation` for spells.
- `--first-name` and `--last-name` for wizards.
- `--search` as local bounded search for all resources.
- `--limit` and `--offset` for local pagination.

`limit` default is 10 and cap is 50. `offset` cap is 1000. Text filters
reject URL separators. Resource-specific validation rejects unsupported
filter combinations such as `--resource houses --name Gryffindor`.

Text renderer shows operation identity、endpoint、storage mode、open REST、
no-auth/no Chrome clickstream boundary、transport、resource、query、
pagination、scope、results、online persist command 和 offline replay
command.

## Runtime Audit

实际执行并观察：

- `npx tsx src/cli.ts apis info wizardworld --format text`
- `npx tsx src/cli.ts apis run wizardworld.catalog --help`
- `npx tsx src/cli.ts apis run wizardworld.catalog --format json --`
  `--resource spells --name Patronus --limit 3`
- `npx tsx src/cli.ts apis run wizardworld.catalog --format text --`
  `--resource elixirs --name Felix --limit 3`
- `npx tsx src/cli.ts apis run wizardworld.catalog --format text --`
  `--resource houses --search Gryffindor --limit 4`
- `npx tsx src/cli.ts apis run wizardworld.catalog --format json --`
  `--resource wizards --last-name Weasley --limit 5`
- invalid enum probe: `--spell-type Invalid`
- invalid resource/filter probe: `--resource houses --name Gryffindor`
- online `--persist` followed by offline replay with isolated
  `PUBLIC_APIS_HOME_DIR`
- direct HTTP probes for OpenAPI JSON, valid spell search, invalid enum,
  and excluded feedback route

Runtime audit covered provider info、operation help、representative text、
representative JSON、key parameter combinations、empty result behavior、
invalid enum/filter probes、online persistence、offline replay 和 direct
endpoint probes。未观察到 HTML-as-data、gateway page、warning-as-data、
base64 dump、binary payload、credential flow、account flow、upload/delete/
share workflow 或 browser clickstream。

## 测试与验证（Validation）

新增或更新：

- `src/infrastructure/openApis/wizardWorldClient.ts`
- `src/application/usecases/wizardWorld.ts`
- `src/providers/wizardworld/index.ts`
- `test/wizard-world-client.test.ts`
- `test/live-api/wizard-world.test.ts`
- renderer、registry、endpoint catalog、CLI help 和 JSON-RPC tests。

已执行并通过：

- targeted Wizard World client/output/registry/catalog tests
- targeted JSON-RPC tests for Wizard World and registry surfaces
- direct CLI help audit for `wizardworld.catalog`
- direct CLI runtime audit for text and JSON output
- online `--persist` and offline replay smoke
- `PUBLIC_APIS_LIVE_E2E=1 NODE_NO_WARNINGS=1 node --import tsx --test`
  `test/live-api/wizard-world.test.ts`
- `npm run typecheck`
- `npm run lint`
- `npm run spec:validate`
- `npm run test:contract` with 193 passing tests
- `npm run build:tarball && npm run package:verify`
- `git diff --check`

`test/cli-program.test.ts --test-name-pattern 'Wizard World'` timed out
after 300 seconds because the file spawns many help subprocesses even with
the name pattern. Direct `wizardworld.catalog --help` command succeeded and
showed the curated options.

## 残余不确定（Residual Uncertainty）

The public OpenAPI document does not declare rate limits or SLA. Provider
defaults are therefore bounded, no bulk crawl mode is exposed, and the CLI
does not proxy arbitrary routes.
