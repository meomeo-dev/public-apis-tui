# Open Science Framework Provider Development Closeout

- Provider: Open Science Framework
- Category: Science & Math
- Decision: implemented
- Audit Status: audit-todo
- Research ID: `research_a6c29ccc9638415fa6239ded91bacf19`
- Artifact: `artifact_544d4b71beaf4a28a4e3a397cbcc4e21`
- Evidence:
  - `evidence_db6878deb2384c14b8e145b6c1ea8b0e`
  - `evidence_f258b74a1f9f4650a760fc628c8dab9a`
  - `evidence_a6298e6cec3d4c3eb9aa84230bb3821e`
  - `evidence_f031b1b056e64ec795fffbbad128372e`
  - `evidence_cfbdbc5ab5064e95b2069fa94c0ad6a8`
  - `evidence_14c3f7025f684463930a51f0ea594f42`

## Decision

Implement Open Science Framework as a no-auth HTTPS JSON:API metadata
provider and hand it off to the audit workflow as `implemented` with
`audit-todo`.

Official OSF API v2 documentation and live probes support read-only public
metadata listing without credentials. The implemented contract exposes only
public nodes and public preprints with documented filters and bounded
pagination. It excludes account endpoints, private records, file downloads,
upload/share/delete flows, write methods, review actions, arbitrary route
proxying, browser scraping, and Chrome clickstream behavior.

## Implemented Contract

- `osf.nodes` lists public OSF node metadata from `GET /v2/nodes/`.
- `osf.preprints` lists public preprint metadata from `GET /v2/preprints/`.
- Node filters include title, category, tags, public flag, limit, and page.
- Preprint filters include provider, published flag, limit, and page.
- CLI defaults are `title=reproducibility` and `provider=psyarxiv`.
- Page size defaults to 10 and is capped at 50; page is capped at 500.
- Text output is projected from JSON and includes endpoint, storage mode,
  no-auth/open REST boundary, query, pagination, scope, empty states, and
  online/offline follow-up commands.

## Live Probe

On 2026-05-11, direct probes confirmed the selected public surface:

- `GET https://api.osf.io/v2/` returned HTTP 200
  `application/vnd.api+json` with `current_user` set to `null`.
- `GET /v2/nodes/?filter[title]=reproducibility&page[size]=1` returned
  HTTP 200 JSON:API public node metadata and pagination.
- `GET /v2/preprints/?filter[provider]=psyarxiv&filter[is_published]=true`
  returned HTTP 200 JSON:API public preprint metadata and pagination.
- `GET /v2/users/me/` returned HTTP 401 JSON:API, confirming account-scoped
  resources remain outside the no-auth provider contract.

## Runtime UX

Runtime audit covered:

- `apis info osf`
- `apis run osf.nodes --help`
- `apis run osf.preprints --help`
- Representative nodes and preprints JSON output.
- Representative nodes and preprints text output.
- Category, provider, publication, limit, and page parameter combinations.
- Invalid `--limit 51`, invalid `--category paper`, and invalid provider
  slug probes.
- Online `--persist` saves for both operations.
- Offline `--offline` replay for both operations.
- Direct endpoint probes for API root, nodes, preprints, and auth boundary.

## Validation

Recorded passing validation:

- `npm run typecheck`
- `npm run lint`
- `npm run spec:validate`
- `NODE_NO_WARNINGS=1 node --import tsx --test test/osf-client.test.ts`
- `NODE_NO_WARNINGS=1 node --import tsx --test
  test/public-api-registry.test.ts test/endpoint-catalog.test.ts`
- `NODE_NO_WARNINGS=1 node --import tsx --test test/cli-output.test.ts
  --test-name-pattern 'OSF|public API text renderers'`
- `npm run test:contract -- --run test/contract/json-rpc.test.ts`
- `PUBLIC_APIS_LIVE_E2E=1 NODE_NO_WARNINGS=1 node --import tsx --test
  test/live-api/osf.test.ts`
- `git diff --check`

## Residual Uncertainty

OSF public metadata is user-generated research metadata and upstream
availability can vary. The CLI keeps persistence opt-in, caps result volume,
renders text from structured JSON only, and discloses the read-only public
metadata boundary in provider metadata and text output.
