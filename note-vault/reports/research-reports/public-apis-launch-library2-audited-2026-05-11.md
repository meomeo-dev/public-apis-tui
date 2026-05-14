# Launch Library 2 Provider 审计记录（Audit Record）- Audited

- Provider: Launch Library 2
- Category: Science & Math
- Catalog URL: `https://thespacedevs.com/llapi`
- Date: 2026-05-11 UTC
- Decision: audited
- Provider ID: `launchlibrary2`
- Operations: `launchlibrary2.launches`, `launchlibrary2.events`
- Research ID: `research_ed53cccf4c1f4efc97db36b43cfb03c3`
- Artifact: `artifact_db40af54a91740b6a637631624fb128d`

## 结论（Decision）

Launch Library 2 provider 通过 command-driven runtime/TUI audit。实现继续
暴露 documented LL2 v2.3.0 HTTPS JSON endpoints：

- `GET https://ll.thespacedevs.com/2.3.0/launches/upcoming/`
- `GET https://ll.thespacedevs.com/2.3.0/events/upcoming/`

CLI 只使用 read-only upcoming launches 和 upcoming events resources，并在
本地执行 bounded search、date window、provider、ordering、limit 和 offset
validation。Arbitrary OpenAPI route proxying、API-key high-rate paths、
cookie/session auth、ICS feed parsing、image downloads、webhooks、
browser scraping、browser clickstream、upload/delete/share workflows、
binary/base64 payloads 和 mutating operations 均不暴露。

审计期间未观察到 Cloudflare challenge、CAPTCHA、gateway interstitial、
parked-domain page、credential prompt 或 HTML-as-data。Swagger docs 是
预期的 HTML documentation page，不作为 CLI 数据源。为满足 challenge
regression guardrail，客户端已补充 provider-specific Cloudflare
challenge HTML detection；未来 403/429 challenge HTML 会抛出明确
`OPEN_API_FAILED`，提示 retry later 或使用 cached/offline data，而不是
普通 JSON parse failure。

## Runtime Audit

实际执行并观察：

- `node --import tsx src/cli.ts apis info launchlibrary2`
- `node --import tsx src/cli.ts apis run launchlibrary2.launches --help`
- `node --import tsx src/cli.ts apis run launchlibrary2.events --help`
- `node --import tsx src/cli.ts apis run launchlibrary2.launches`
  `--format text -- --limit 3 --offset 0`
- `node --import tsx src/cli.ts apis run launchlibrary2.launches`
  `--format json -- --limit 2 --offset 1 --ordering -net`
- `node --import tsx src/cli.ts apis run launchlibrary2.events`
  `--format text -- --limit 3 --hide-recent-previous true`
- `node --import tsx src/cli.ts apis run launchlibrary2.events`
  `--format json -- --limit 2 --offset 1 --ordering -date`
- launches filter probe for `--search Falcon --lsp SpaceX`, date window,
  and `--limit 2`
- events filter probe for `--search Docking`, date window,
  `--hide-recent-previous true`, and `--limit 2`
- empty search probes for unlikely launch and event queries
- invalid probes for `--limit 101`, `--offset 10001`, `--ordering name`,
  and `--start tomorrow`
- online `--persist` followed by offline replay with an isolated
  `PUBLIC_APIS_HOME_DIR`

Representative outputs showed provider identity, endpoint, storage mode,
HTTPS JSON REST transport, open API/no-auth/no Chrome clickstream boundary,
query, pagination, rate policy, launch/event rows, next commands, companion
operation commands, and replay commands. Text output did not dump HTML pages,
warning pages, binary data, image bytes, or base64 data.

Invalid probes exited nonzero with `INVALID_ARGUMENT` and clear local
validation messages before any out-of-range request.

## Direct Endpoint Probes

Direct probes covered:

- `GET https://thespacedevs.com/llapi` returned HTTP 200 `text/html`.
- `GET https://ll.thespacedevs.com/2.3.0/schema/` returned HTTP 200
  `application/json`.
- `GET https://ll.thespacedevs.com/2.3.0/swagger/` returned HTTP 200
  `text/html; charset=utf-8`.
- `GET https://ll.thespacedevs.com/2.3.0/api-throttle/` returned HTTP 200
  `application/json` with 15 requests per 3600 seconds.
- `GET https://ll.thespacedevs.com/2.3.0/launches/upcoming/?limit=1`
  returned HTTP 200 `application/json`.
- `GET https://ll.thespacedevs.com/2.3.0/events/upcoming/?limit=1`
  returned HTTP 200 `application/json`.

The exposed API routes returned normal JSON launch and event data. No
`cf-mitigated` challenge header, challenge title, CAPTCHA page, parked-domain
page, or gateway interstitial was observed. Server headers identified
Cloudflare infrastructure without challenge mitigation.

## 修复（Fix）

Updated `src/infrastructure/openApis/launchLibrary2Client.ts` so response
bodies are read as text before JSON parsing. The client now detects
representative Cloudflare/challenge signals:

- `cf-mitigated: challenge`
- HTTP 403/429 `text/html`
- Cloudflare server header
- `Just a moment...` challenge title

Detected challenges throw:

- code: `OPEN_API_FAILED`
- message: Launch Library 2 is returning a Cloudflare challenge HTML page
- details: provider id, HTTP status, status text, content type, and URL

Updated `test/launch-library2-client.test.ts` with a regression test that
feeds `cf-mitigated: challenge` and `Just a moment...` HTML into the client
and asserts a clear provider-specific error.

Existing non-JSON and non-OK errors now reuse shared response details.

## 验证（Validation）

Passed:

- `node --import tsx --test test/launch-library2-client.test.ts`
- `node --import tsx --test test/cli-output.test.ts --test-name-pattern`
  `"Launch Library 2"`
- `node --import tsx --test test/public-api-registry.test.ts`
  `--test-name-pattern "launchlibrary2|Launch Library"`
- `node --import tsx --test test/contract/json-rpc.test.ts`
  `--test-name-pattern "launchlibrary2|Launch Library"`
- direct CLI info and help commands
- online `--persist` and offline replay with isolated `PUBLIC_APIS_HOME_DIR`
- direct endpoint probes for docs, schema, throttle, launches, and events
- `PUBLIC_APIS_LIVE_E2E=1 node --import tsx --test`
  `test/live-api/launch-library2.test.ts`
- `npm run lint`
- `npm run typecheck`
- `npm run spec:validate`
- `npm run build`
- `npm run package:verify`
- `npm run quality:check` with lint, typecheck, spec validation, full test,
  and contract stages passing
- full `npm run test` within `quality:check` with 1289 passing tests
- `npm run test:contract` within `quality:check` with 194 passing tests
- `git diff --check`
- touched-file line-width scan for Launch Library 2 source and tests
- targeted secret scan for Launch Library 2 source and tests

## 残余不确定（Residual Uncertainty）

Launch Library 2 data depends on upstream availability, schedule churn, and
the documented no-auth quota. The provider now fails clearly if future
WAF/challenge HTML appears, and cached/offline replay remains available for
previously persisted requests.
