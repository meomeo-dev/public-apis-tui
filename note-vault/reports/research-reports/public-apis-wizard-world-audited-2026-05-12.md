# Wizard World Provider 审计记录（Audit Record）- Audited

- Provider: Wizard World
- Category: Books
- Catalog URL: `https://wizard-world-api.herokuapp.com/swagger/index.html`
- Date: 2026-05-12 UTC
- Decision: audited
- Provider ID: `wizardworld`
- Operations: `wizardworld.catalog`
- Research ID: `research_74d816bfabb64850851b302b9512175c`
- Artifact: `artifact_228f898fb2d64cd7b1a355102632b162`

## 结论（Decision）

Wizard World provider 通过 command-driven runtime/TUI audit。实现继续暴露
no-auth HTTPS JSON REST read-only collection endpoints:

- `GET https://wizard-world-api.herokuapp.com/Elixirs`
- `GET https://wizard-world-api.herokuapp.com/Houses`
- `GET https://wizard-world-api.herokuapp.com/Ingredients`
- `GET https://wizard-world-api.herokuapp.com/MagicalCreature`
- `GET https://wizard-world-api.herokuapp.com/Spells`
- `GET https://wizard-world-api.herokuapp.com/Wizards`

CLI 只使用 curated resource、name、local search、elixir filters、spell
filters、wizard filters、limit 与 offset controls。输出保持 bounded catalog
records、references、pagination、storage mode 与 open-API boundary projection。

Swagger UI scraping、`POST /Feedback`、item detail route proxying、arbitrary
route proxying、upload/delete/share workflows、binary payloads、base64 payloads
与 upstream validation errors-as-data remain excluded.

## Runtime Audit

实际执行并观察：

- `npx tsx src/cli.ts apis info wizardworld`
- `npx tsx src/cli.ts apis run wizardworld.catalog --help`
- `npx tsx src/cli.ts apis run wizardworld.catalog --format text`
  `-- --resource spells --name Patronus --limit 3`
- `npx tsx src/cli.ts apis run wizardworld.catalog --format json`
  `-- --resource elixirs --name Felix --limit 3`
- `npx tsx src/cli.ts apis run wizardworld.catalog --format text`
  `-- --resource houses --search raven --limit 2`
- `npx tsx src/cli.ts apis run wizardworld.catalog --format json`
  `-- --resource wizards --first-name Harry --limit 3`
- `npx tsx src/cli.ts apis run wizardworld.catalog --format text`
  `-- --resource creatures --search dragon --limit 2`
- empty-state spell search with `--search no-such-spell-zzzz`
- invalid probes for resource `feedback`, unsupported house `--name`,
  invalid difficulty `Impossible`, and unsafe name `../secret`
- online `--persist` followed by offline replay with isolated
  `PUBLIC_APIS_HOME_DIR`

Representative outputs showed provider identity, endpoint, storage mode,
HTTPS JSON REST transport, no-auth/open REST boundary, no Chrome clickstream
boundary, resource/query summary, pagination, empty-state remediation,
again/replay commands, and next commands. Text output did not dump Swagger UI
HTML, problem JSON, raw upstream arrays, binary data, or base64 data.

Invalid resource, unsupported filter, enum, and path probes exited nonzero
with `INVALID_ARGUMENT` before unsafe or noisy requests were built.

## Direct Endpoint Probes

Direct probes covered:

- Swagger UI; returned HTTP 200 `text/html` documentation.
- OpenAPI JSON; returned HTTP 200 `application/json`.
- root path; returned HTTP 404 with empty body outside CLI projection.
- Spells, Elixirs, Houses, Ingredients, MagicalCreature, and Wizards routes;
  returned HTTP 200 `application/json`.
- `GET /Feedback`; returned HTTP 405 outside CLI projection.
- invalid spell enum; returned HTTP 400 `application/problem+json` outside
  operation data and is blocked locally by enum validation.
- missing route; returned HTTP 404 outside CLI projection.

Runtime routes used `server: Heroku`. No `cf-mitigated: challenge`,
Cloudflare challenge title, CAPTCHA page, JavaScript redirect shell,
parked-domain page, gateway interstitial, credential flow, browser clickstream,
binary runtime payload, or base64 runtime payload was observed.

## 修复（Fix）

Updated `src/infrastructure/openApis/wizardWorldClient.ts` so response bodies
are read as text, checked for representative challenge signals, then parsed as
JSON:

- HTTP 403/429 `text/html`
- `cf-mitigated: challenge`
- Cloudflare server header
- `Just a moment...` challenge title
- CAPTCHA, access-denied, and attention-required HTML markers

Detected challenges throw:

- code: `OPEN_API_FAILED`
- message: Wizard World is returning a challenge HTML page
- details: provider id, HTTP status, status text, content type, and URL

Updated `test/wizard-world-client.test.ts` with regression coverage for
challenge HTML.

## 验证（Validation）

Passed:

- `node --import tsx --test test/wizard-world-client.test.ts`
- `node --import tsx --test test/cli-output.test.ts --test-name-pattern`
  `"Wizard World|wizardworld"`
- `node --import tsx --test test/public-api-registry.test.ts`
  `--test-name-pattern "Wizard World|wizardworld"`
- `node --import tsx --test test/endpoint-catalog.test.ts`
  `--test-name-pattern "Wizard World|wizardworld"`
- `node --import tsx --test test/contract/json-rpc.test.ts`
  `--test-name-pattern "Wizard World|wizardworld"`
- direct CLI info/help, runtime text/JSON, invalid-argument, empty-state,
  endpoint, mutating-route, and challenge-boundary probes
- online `--persist` and offline replay with isolated `PUBLIC_APIS_HOME_DIR`
- `PUBLIC_APIS_LIVE_E2E=1 node --import tsx --test`
  `test/live-api/wizard-world.test.ts`
- `npm run lint`
- `npm run typecheck`
- `npm run spec:validate`
- `npm run build:tarball`
- `npm run package:verify`
- `npm run quality:check` with lint, typecheck, spec validation, full test,
  and contract stages passing
- full test stage within `quality:check` with 1309 passing unit tests
- contract stage within `quality:check` with 194 passing contract tests

## 残余不确定（Residual Uncertainty）

No public quota, rate limit, or SLA is documented for the selected endpoints.
The provider currently serves through Heroku and returned normal JSON for
exposed routes. The provider now fails clearly if future WAF/challenge HTML
appears, and cached/offline replay remains available for previously persisted
requests.

## 参考（References）

- `evidence_bc7423e4856b4b439496e801c2c73d86`
- `evidence_0877f1915e5b4995805d302b19f16daf`
- `evidence_020d6cb1c34146f19abb1961f6763d4b`
- `evidence_9521c2ce4b084caf9054787f684f8fef`
