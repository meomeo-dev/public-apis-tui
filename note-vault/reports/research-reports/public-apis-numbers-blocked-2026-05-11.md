# Numbers API Provider Development Decision - Blocked

- Provider: Numbers API
- Category: Science & Math
- Backlog line: 1455
- Catalog URL: http://numbersapi.com
- Date: 2026-05-11
- Decision: blocked
- Research ID: research_cd10c93276924a2bbbf7760d1a1782be
- Artifact ID: artifact_dc79fc7e72d44853ad47851fb9b6fe8b

## Workflow Context

Tire1.6 development requires a usable no-auth API, official source
validation, repeatable live e2e coverage, persistence/offline replay, and no
browser clickstream or credential workaround. Science & Math providers also
require review for code execution, proxying, binary rendering, public-safety,
health, and restricted-content risk before exposing CLI operations.

## Official Source Review

The listed host `numbersapi.com` no longer served the historical Numbers API
documentation or fact endpoints during this run. The root page returned HTML
whose title and description referenced unrelated slot/gambling promotional
content. Historical endpoint shapes that should return number facts in JSON
returned HTML 404 pages instead.

Because the current official/listed source does not provide a stable no-auth
JSON or text API surface, implementation would require stale endpoint
assumptions or HTML-as-data handling. Both options violate the open-API-only
boundary.

## Live Probe Evidence

All probes were executed from this repository environment on 2026-05-11.

- `GET https://numbersapi.com/` returned HTTP 200 `text/html` with unrelated
  promotional HTML content.
- `GET https://numbersapi.com/42?json` returned HTTP/2 404 `text/html` with
  an HTML 404 page.
- `GET http://numbersapi.com/42?json` returned HTTP/1.1 404 `text/html` with
  an HTML 404 page.
- `GET http://numbersapi.com/42/math?json` returned HTTP/1.1 404 `text/html`
  with an HTML 404 page.
- `GET http://numbersapi.com/42/year?json` returned HTTP/1.1 404 `text/html`
  with an HTML 404 page.
- `GET http://numbersapi.com/random/trivia?json` returned HTTP/1.1 404
  `text/html` with an HTML 404 page.

Deep-research evidence:

- `evidence_04d19f3d08424b4e95733039de290f4e`
- `evidence_297ffc144a44420199a2a70377714bc6`
- `evidence_29e41036563b4f16882406d2f9bbccd6`
- `evidence_bd24495176ce4d989dcd4d76eb3b5aa5`

## Risk and Boundary Assessment

- No-auth API usability: failed; no repeatable structured response found.
- Official documentation usability: failed; the root page is unrelated HTML.
- HTML-as-data risk: elevated; all useful probes returned HTML.
- Restricted-content risk: elevated; the root page content is unrelated
  gambling/slot promotional material.
- Science & Math safety: no code-execution or binary-rendering risk was found
  because no usable endpoint was found.
- Workflow fit: failed; no provider contract, live e2e, or offline seed can be
  validated from current official responses.

## Decision

Mark `Numbers` as blocked with `auditStatus: n/a`. No provider module,
registry entry, endpoint catalog record, renderer, live e2e test, or
persistence seed was added.

## Validation

- Task table synchronized to `blocked`.
- Runtime CLI audit was not applicable because no implementation artifacts were
  created.
- Live e2e and offline replay were not applicable because the no-auth API
  surface could not be validated.

## Residual Uncertainty

The historical Numbers API may return if `numbersapi.com` is restored or
redeployed. Revisit only after direct live probes of official endpoints return
repeatable structured no-auth data without HTML pages, browser clickstream, or
restricted content.
