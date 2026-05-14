# Rig Veda Provider Development Closeout

- Provider: Rig Veda
- Category: Books
- Decision: implemented
- Audit Status: audit-todo
- Research ID: `research_65852a14f58a436d99c7d5e594a8985d`
- Artifact: `artifact_50e954e6b0c845ee9250996bb4b2d948`
- Evidence:
  - `evidence_2e83862b2d164b6a91716a73d884bf11`
  - `evidence_6167d7be949748e6bb996c52fa96b711`
  - `evidence_01ad2f22d2de46219d5d5c621cf37892`
  - `evidence_e38493323905455a85aa1856ac32ffb6`
  - `evidence_50dc8a34ad6242fb8394df8ef38ba2bb`
  - `evidence_c6756e833cd94dd39ac97a2393aa4959`
  - `evidence_52f7cb339aa6474290662007350607db`
  - `evidence_9e15a74a687244369e859e05c4097e46`

## Decision

Implement Rig Veda as a no-auth HTTPS JSON metadata provider and hand it to
the audit workflow as `implemented` with `audit-todo`.

The public-apis listed URL now returns GitHub Pages 404 HTML, so it is not a
usable API contract. Current same-project Indica documentation and OpenAPI JSON
document the active metadata API on Render. Live probes confirmed selected
read-only routes return structured JSON without API keys, OAuth, account setup,
cookies, or browser clickstream.

## Implemented Contract

- `rigveda.book` reads `GET /book/{mandal}` for one mandal/book.
- `rigveda.search` maps curated search fields to documented metadata routes.
- Search fields cover god, poet, meter, poet category, god category, god in
  book, god by poet, and god category by poet category.
- Local pagination applies `limit` and `offset` to upstream unpaginated arrays.
- `limit` defaults to 20 and is capped at 100.
- Text output is projected from JSON and includes endpoint, storage mode,
  no-auth boundary, query, pagination, facets, records, and follow-up commands.

Excluded surfaces:

- Deprecated `/indica/html/rv.html` HTML page.
- HTML warning payloads and warning-as-data rendering.
- Arbitrary path proxying and guessed historical hosts.
- Browser scraping, Chrome clickstream, account behavior, upload, delete, and
  share workflows.
- Binary, image-only, and base64 payloads.

## Live Probe

On 2026-05-11, direct probes confirmed:

- `GET https://aninditabasu.github.io/indica/html/rv.html` returned HTTP 404
  `text/html`.
- `GET https://aninditabasu.github.io/indica/topics/api_rv.html` returned
  HTTP 200 `text/html` for the current Rig Veda API reference.
- `GET https://aninditabasu.github.io/indica/assets/openapi_rv.json` returned
  HTTP 200 `application/json` OpenAPI metadata.
- `GET https://indica-1hwj.onrender.com/rv/v2/meta/book/4` returned HTTP 200
  `application/json` with 116 records.
- `GET https://indica-1hwj.onrender.com/rv/v2/meta/god/ganga` returned
  HTTP 200 `application/json` with one record.
- `GET https://indica-1hwj.onrender.com/rv/v2/meta/godcategory/gods`
  returned HTTP 200 `text/html` warning text, so category values are validated
  locally and non-JSON responses are rejected.

Additional live probes confirmed meter, poet, poet-category, god-in-book,
god-by-poet, god-category, and combined category routes.

## Runtime UX

Runtime audit covered:

- `apis info rigveda`
- `apis run rigveda.book --help`
- `apis run rigveda.search --help`
- Representative book and search text output.
- Representative book and search JSON output.
- Meter, poet-category, god-in-book, god-by-poet, and combined category
  parameter combinations.
- Invalid mandal, limit, field, unsafe slash text, and invalid category probes.
- Online `--persist` with isolated `PUBLIC_APIS_HOME_DIR`.
- Offline replay from the same isolated cache.

## Validation

Recorded passing validation:

- `npm run spec:validate`
- `npm run typecheck`
- `npm run lint`
- `NODE_NO_WARNINGS=1 node --import tsx --test
  test/public-api-registry.test.ts test/endpoint-catalog.test.ts
  test/rigveda-client.test.ts test/cli-output.test.ts
  test/contract/json-rpc.test.ts`
- `npm run test:contract`
- `npm run build`
- `npm run package:verify`
- `PUBLIC_APIS_LIVE_E2E=1 NODE_NO_WARNINGS=1 node --import tsx --test
  test/live-api/rigveda.test.ts`
- `git diff --check`

`npm run test` timed out after 600 seconds without observed failures before
the timeout. Targeted provider, contract, static, build, packaging, and gated
live e2e gates passed, so the timeout is recorded as residual process risk
rather than a Rig Veda provider failure.

## Residual Uncertainty

The API is hosted on Render and can cold-start. Runtime probes showed slower
first responses and faster warmed responses. The CLI uses bounded output,
local validation, opt-in persistence, and JSON-only parsing to keep the
provider inside the open read-only API boundary.
