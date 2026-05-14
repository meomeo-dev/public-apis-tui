# arXiv Provider Development Closeout

- Provider: arXiv
- Category: Science & Math
- Decision: implemented
- Audit Status: audit-todo
- Research ID: `research_19ee5d593d19415196c4bec9fed283f3`
- Artifact: `artifact_ea0537746c8a498ca004d4703d7a8cfb`
- Evidence:
  - `evidence_3ae38af545684234bf93b16f2cdef1b2`
  - `evidence_eb695843685942e48f97d2cf5dec05ac`
  - `evidence_1106196d57a948fab0faa417f344d7e3`

## Decision

Implement arXiv as a no-auth metadata provider and hand it off to the audit
workflow as `implemented` with `audit-todo`.

The official API supports public GET requests to
`https://export.arxiv.org/api/query` and returns Atom XML. The implemented
contract exposes only paper metadata and links. It does not download PDFs,
scrape article pages, require API keys, use cookies, or use browser
clickstream.

## Implemented Contract

- `arxiv.search` searches paper metadata through `search_query`.
- `arxiv.paper` fetches one paper metadata record through `id_list`.
- Atom XML is parsed into bounded JSON before text rendering.
- Search exposes curated query, category, start, maxResults, sortBy,
  sortOrder, and summaryLength options.
- Paper lookup exposes id and summaryLength options.
- The CLI cap is 100 results per interactive request although the official
  single-slice maximum is larger.
- Endpoint catalog metadata is registered with confirmed no-auth evidence.

## Live Probe

On 2026-05-10, a direct probe to:

```text
https://export.arxiv.org/api/query?search_query=all:electron&start=0&max_results=1
```

returned HTTP 200 with `application/atom+xml; charset=utf-8`. The response
contained `opensearch` pagination fields and normal paper metadata entries.

## Runtime UX

Runtime smoke covered:

- `apis info arxiv`
- `apis run arxiv.search --help`
- `apis run arxiv.paper --help`
- Representative search and paper JSON output.
- Representative search and paper text output.
- Invalid and boundary parameter checks.
- Online `--persist` save.
- Offline `--offline` replay.

Text output shows provider identity, endpoint, storage mode, no-auth/open REST
boundary, no Chrome clickstream boundary, query, pagination/count, rate note,
empty state, paper links, and next commands.

## Validation

Recorded passing validation:

- `npm run typecheck`
- `npm run lint`
- `npm run spec:validate`
- `NODE_NO_WARNINGS=1 node --import tsx --test test/arxiv-client.test.ts`
- `NODE_NO_WARNINGS=1 node --import tsx --test test/cli-output.test.ts
  --test-name-pattern arXiv`
- `NODE_NO_WARNINGS=1 node --import tsx --test
  test/public-api-registry.test.ts`
- `PUBLIC_APIS_LIVE_E2E=1 NODE_NO_WARNINGS=1 node --import tsx --test
  test/live-api/arxiv.test.ts`

## Residual Uncertainty

Upstream arXiv availability and rate behavior can vary. The provider records
the documented delay expectation and keeps interactive result size bounded.
The implementation avoids binary/PDF retrieval and treats arXiv as metadata
only.
