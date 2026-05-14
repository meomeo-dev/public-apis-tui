# Church Calendar Provider Development Closeout

- Provider: Church Calendar
- Category: Calendar
- Decision: implemented
- Audit Status: audit-todo
- Research ID: `research_da7c3fb631eb456aa1d14611f206d417`
- Artifact: `artifact_42bcca21ab7741d58cf5ba29a7cb403b`
- Evidence:
  - `evidence_adb34ca269124a0b9eea54b3fabf7312`
  - `evidence_22e568b5866643ad96d4f5577d69850b`
  - `evidence_0e881da8152e449ab87b337e0f771dd2`
  - `evidence_5ce2997da50943e0aecf5fbff637b5c0`

## Decision

Implement Church Calendar as a no-auth HTTP JSON provider and hand it off to
the audit workflow as `implemented` with `audit-todo`.

The official documentation and Swagger schema publish a v0 API under
`/api/v0` with JSON responses and no credential requirement. The implemented
contract uses only documented calendar day and month paths. It does not use
browser clickstream, account setup, upload/share/delete behavior, binary
rendering, or guessed ISO-date path variants.

## Implemented Contract

- `churchcalendar.day` fetches one liturgical day by `YYYY-MM-DD`.
- `churchcalendar.month` lists one Gregorian month with a CLI cap of 31 days.
- Defaults are language `en` and calendar `general-en`.
- Supported language and calendar identifiers are validated locally.
- Endpoint catalog records disclose HTTP-only transport and confirmed evidence.
- Text output is projected from JSON and shows endpoint, storage mode, HTTP
  JSON transport, no-auth/open API boundary, query, scope, counts, empty
  states, and next commands.

## Live Probe

On 2026-05-10, a direct probe to:

```text
http://calapi.inadiutorium.cz/api/v0/en/calendars/general-en/2026/5/10
```

returned HTTP 200 with `application/json; charset=utf-8`. The response
contained `date`, `season`, `weekday`, and `celebrations` fields.

## Runtime UX

Runtime smoke covered:

- `apis info churchcalendar`
- `apis run churchcalendar.day --help`
- `apis run churchcalendar.month --help`
- Representative day and month JSON output.
- Representative day and month text output.
- Latin language/calendar parameter combination.
- Month limit 31 boundary.
- Invalid date and invalid limit errors.
- Online `--persist` save.
- Offline `--offline` replay.

## Validation

Recorded passing validation:

- `npm run typecheck`
- `NODE_NO_WARNINGS=1 node --import tsx --test
  test/church-calendar-client.test.ts`
- `NODE_NO_WARNINGS=1 node --import tsx --test test/cli-output.test.ts`
- `NODE_NO_WARNINGS=1 node --import tsx --test
  test/public-api-registry.test.ts`
- `NODE_NO_WARNINGS=1 node --import tsx --test
  test/contract/json-rpc.test.ts`
- `PUBLIC_APIS_LIVE_E2E=1 NODE_NO_WARNINGS=1 node --import tsx --test
  test/live-api/church-calendar.test.ts`

## Residual Uncertainty

The upstream service is HTTP-only and availability can vary. The CLI discloses
HTTP JSON transport in manifest metadata and text output. The implementation
keeps the provider read-only and avoids browser scraping, credentials,
mutating file workflows, binary rendering, and undocumented endpoints.
