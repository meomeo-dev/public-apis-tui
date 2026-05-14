# Runyankole Bible Provider Development Closeout

- Provider: Runyankole Bible
- Category: Books
- Decision: implemented
- Audit Status: audit-todo
- Research ID: `research_db9e31093b6b4343b6994b0dd5373322`
- Artifact: `artifact_3bd5ae13412d465a9578b70b18f5f5be`
- Evidence:
  - `evidence_2d8f4c3c693047e1814cbf5b7338bc03`
  - `evidence_fdee17ea7c0f491281222d6984318379`
  - `evidence_79be65ea366f4064a72e1872f5f98b2c`
  - `evidence_50aaa186dd7d4d4ca0108cfcbe75fd9d`
  - `evidence_bf07e092b03247e3939d569370674ac2`
  - `evidence_2914e93d61114952b919b406a27376ed`

## Decision

Implement Runyankole Bible as a no-auth HTTPS JSON Books provider and hand it
to the audit workflow as `implemented` with `audit-todo`.

The same-origin homepage is the provider documentation. It states free public
access, no authentication, CORS support, 66 books, and 31,106 verses. Live
probes confirmed documented read-only JSON endpoints returned structured JSON
without API keys, OAuth, account setup, cookies, or browser clickstream.

## Implemented Contract

- `runyankolebible.books` lists book IDs and names from `GET /api/books`.
- `runyankolebible.verse` fetches one verse by book, chapter, and verse.
- `runyankolebible.chapter` fetches one chapter and applies local pagination.
- `runyankolebible.search` maps query, limit, and offset to `/api/search`.
- `runyankolebible.random` fetches one random verse, optionally by book.

The provider includes JSON metadata for endpoint, authentication, transport,
translation, attribution, boundary, pagination policy, and excluded surfaces.
Text output is projected only from JSON results and shows storage mode,
no-auth boundary, no Chrome clickstream boundary, query, pagination, source
scope, scripture rows, and follow-up commands.

Excluded surfaces:

- Homepage HTML as data.
- Undocumented path or route proxying.
- Browser scraping and Chrome clickstream.
- Account, cookie, API key, and OAuth workflows.
- Bulk text download workflows.
- Upload, delete, and share workflows.
- Binary and base64 payloads.

## Live Probe

On 2026-05-11, direct probes confirmed:

- `GET https://runyankole-bible-api.vercel.app/api/books` returned HTTP 200
  `application/json` with `count: 66` and a `books` array.
- `GET /api/verse?book=10&chapter=1&verse=1` returned HTTP 200
  `application/json` with one verse object.
- `GET /api/chapter?book=10&chapter=1` returned HTTP 200
  `application/json` with a chapter object and `verses`.
- `GET /api/search?q=Ruhanga&limit=2&offset=1` returned HTTP 200
  `application/json` with a search envelope.
- `GET /api/random` and `GET /api/random?book=10` returned HTTP 200
  `application/json` verse objects.
- Invalid search `q=a` returned HTTP 400 `application/json` with
  `Query too short`.
- Invalid verse references returned HTTP 404 `application/json` provider
  errors.

## Runtime UX

Runtime audit covered:

- `apis info runyankolebible`
- Help for all five operations.
- Representative text output for books, chapter, and random.
- Representative JSON output for verse and search.
- Search with limit and offset.
- Invalid book, chapter, verse, query, unsafe query, and limit probes.
- Direct endpoint status, content type, and body samples.
- Online `--persist` with isolated `PUBLIC_APIS_HOME_DIR`.
- Offline replay from the same isolated cache.

No HTML-as-data, gateway page, warning payload, binary payload, base64 dump,
credential flow, account flow, upload/delete/share workflow, or browser
clickstream behavior was observed for exposed routes.

## Validation

Recorded passing validation:

- `npm run spec:validate`
- `npm run typecheck`
- `npm run lint`
- `NODE_NO_WARNINGS=1 node --import tsx --test
  test/runyankolebible-client.test.ts`
- Targeted registry, endpoint catalog, CLI output, CLI help, and JSON-RPC
  tests with 404 passing tests.
- `npm run test:contract` with 184 passing tests.
- `npm run build`
- `npm run package:verify`
- `PUBLIC_APIS_LIVE_E2E=1 NODE_NO_WARNINGS=1 node --import tsx --test
  test/live-api/runyankolebible.test.ts`
- `git diff --check`

`npm run test` timed out after 600 seconds without observed failures before
the timeout. Targeted provider, contract, static, build, packaging, runtime,
and gated live e2e gates passed, so the timeout is recorded as residual
process risk rather than a Runyankole Bible provider failure.

## Residual Uncertainty

The API is hosted on Vercel and may change outside this repository. The CLI
keeps output bounded, validates parameters locally, parses JSON only, records
attribution, and supports explicit persistence plus offline replay to keep the
provider inside the open read-only API boundary.
