# World Bank Provider 开发记录（Development Record）- Implemented

- Provider: World Bank
- Category: Science & Math
- Backlog line: 1469
- Catalog URL: `https://datahelpdesk.worldbank.org/knowledgebase/topics/125589`
- Date: 2026-05-12
- Decision: implemented
- Provider ID: `worldbank`
- Operations: `worldbank.countries`, `worldbank.indicator`
- Research ID: `research_b62da81e890e478d9c628a573e9447fc`
- Evidence:
  - `evidence_681fd92447b9436480f0a504c335e9df`
  - `evidence_74d8fcadbe1243b285588617d30faea1`
  - `evidence_1a388ed296154df8ba180d92d3adb07a`
  - `evidence_6dae78670ed64764a08fd3c79e894f64`
- Artifact: `artifact_52976ddab1c6481e86ffdda76f4d9a34`

## 工作流边界（Workflow Boundary）

Tire1.6 Science & Math provider 开发要求可复核的无认证
（no-auth）结构化公共 API。World Bank provider 只暴露
`api.worldbank.org/v2` read-only JSON routes，并固定 `format=json`。
实现排除 helpdesk HTML scraping、XML/HTML output、bulk download
mirroring、arbitrary route proxying、browser clickstream、account workflow、
upload/delete/share workflow、binary payload 和 base64 payload。

## 官方来源复核（Official Source Review）

Public-apis backlog 指向 World Bank Data Helpdesk API topics：

- `https://datahelpdesk.worldbank.org/knowledgebase/topics/125589`

实现没有抓取 helpdesk HTML。实际数据访问使用 World Bank API v2
公开 JSON routes：

- `GET https://api.worldbank.org/v2/country?format=json`
- `GET https://api.worldbank.org/v2/country/{country}/indicator/{indicator}`
- `GET https://api.worldbank.org/v2/indicator/{indicator}`

选定 routes 没有 API key、OAuth、cookie、account setup、browser
session 或 Chrome clickstream 要求。

## Live Probe 证据

所有探测均在 2026-05-12 从本仓库环境执行，未发送 API key、OAuth
token、cookie、账户凭据或浏览器会话。

- `GET /v2/country?format=json&per_page=3` returned HTTP 200
  `application/json;charset=utf-8` with paged country and aggregate rows.
- `GET /v2/country/US/indicator/SP.POP.TOTL` with `format=json`,
  `per_page=3`, and `date=2020:2022` returned HTTP 200
  `application/json;charset=utf-8` with three US population observations.
- `GET /v2/indicator/SP.POP.TOTL?format=json&per_page=3` returned
  HTTP 200 `application/json;charset=utf-8` with indicator metadata.
- Invalid or provider-message payloads are treated as `OPEN_API_FAILED`,
  not ordinary result data.
- Local validation rejects invalid country length, unsafe indicator code,
  date ranges over 60 years, page above 1000, and `per_page` above 100.

## 实现（Implementation）

新增 `WorldBankClient`，使用 `fetch` 调用 World Bank API base：
`https://api.worldbank.org/v2`。

新增 operations：

- `worldbank.countries`: lists bounded country and aggregate metadata.
- `worldbank.indicator`: reads bounded country indicator time series and
  one metadata lookup for the indicator label, source, and topic context.

CLI exposes curated parameters only:

- `worldbank.countries`: `--page`, `--per-page`.
- `worldbank.indicator`: `--country`, `--indicator`, `--date`, `--page`,
  `--per-page`.

Defaults are intentionally small and reproducible: country `US`, indicator
`SP.POP.TOTL`, date `2020:2022`, page `1`, and `perPage` `20`. `perPage`
is capped at 100, page at 1000, and year ranges at 60 years.

Text renderer shows operation identity、endpoint、storage mode、open REST、
no-auth/no Chrome clickstream boundary、transport、query、pagination、scope、
country or indicator rows、online persist command 和 offline replay command.

## Runtime Audit

实际执行并观察：

- `npx tsx src/cli.ts apis info worldbank --format text`
- `npx tsx src/cli.ts apis run worldbank.countries --help`
- `npx tsx src/cli.ts apis run worldbank.indicator --help`
- `npx tsx src/cli.ts apis run worldbank.countries --format text --`
  `--page 1 --per-page 3`
- `npx tsx src/cli.ts apis run worldbank.countries --format json --`
  `--page 1 --per-page 3`
- `npx tsx src/cli.ts apis run worldbank.indicator --format text --`
  `--country US --indicator SP.POP.TOTL --date 2020:2022 --per-page 3`
- `npx tsx src/cli.ts apis run worldbank.indicator --format json --`
  `--country US --indicator SP.POP.TOTL --date 2020:2022 --per-page 3`
- invalid probes for country length, indicator code, date range, and
  per-page boundary.
- online `--persist` followed by offline replay with isolated
  `PUBLIC_APIS_HOME_DIR` for both operations.
- direct HTTP probes for country list, indicator series, and indicator
  metadata routes.

Runtime audit covered provider info、operation help、representative text、
representative JSON、key parameter combinations、invalid/boundary probes、
online persistence、offline replay 和 direct endpoint probes。未观察到
HTML-as-data、gateway page、warning-as-data、base64 dump、binary payload、
credential flow、account flow、upload/delete/share behavior 或 browser
clickstream。

## 测试与验证（Validation）

新增或更新：

- `src/infrastructure/openApis/worldBankClient.ts`
- `src/application/usecases/worldBank.ts`
- `src/providers/worldbank/index.ts`
- `test/world-bank-client.test.ts`
- `test/live-api/world-bank.test.ts`
- renderer、registry、endpoint catalog、CLI help 和 JSON-RPC tests。

已执行并通过：

- targeted World Bank client/output/registry/catalog tests with 231 passing
  tests in the selected group.
- targeted JSON-RPC tests for World Bank and registry surfaces.
- direct CLI help audit for `worldbank.countries` and `worldbank.indicator`.
- direct CLI runtime audit for text and JSON output.
- online `--persist` and offline replay smoke for both operations.
- `PUBLIC_APIS_LIVE_E2E=1 NODE_NO_WARNINGS=1 node --import tsx --test`
  `test/live-api/world-bank.test.ts` with 2 passing tests.
- `npm run typecheck`
- `npm run lint`
- `npm run spec:validate`
- `npm run test:contract` with 194 passing tests.
- `npm run build:tarball && npm run package:verify`
- `git diff --check`

`test/cli-program.test.ts --test-name-pattern 'World Bank'` timed out after
180 seconds because the file spawns many help subprocesses even with the name
pattern. Direct World Bank help commands succeeded and showed the curated
options.

## 仓库命名与发布包复核（Repository And Package Check）

Repository remote and GitHub repository are already `public-apis-cli`:

- `https://github.com/meomeo-dev/public-apis-cli.git`
- `meomeo-dev/public-apis-cli`

`package.json` package name is `public-apis-cli`. README image references
point to existing files under `docs/assets/`. Package verification passed,
including the experimental news-flash directory that was previously missing
from the npm package file list.

## 残余不确定（Residual Uncertainty）

The selected World Bank API v2 routes did not publish a specific rate limit in
the observed docs/probes. Provider defaults are bounded, no bulk crawl mode is
exposed, and the CLI does not proxy arbitrary routes.
