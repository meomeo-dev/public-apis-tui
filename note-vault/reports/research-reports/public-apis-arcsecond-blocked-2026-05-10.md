# arcsecond.io Provider Development Decision - Blocked

- Provider: arcsecond.io
- Category: Science & Math
- Backlog line: 1437
- Catalog URL: https://api.arcsecond.io/
- Date: 2026-05-10
- Decision: blocked
- Research ID: research_5e817b16db3549e38aeabc10d4d57087
- Artifact ID: artifact_548640d33e6441c2a5ff1a886d2c3405

## Workflow Context

The Tire1.6 development workflow requires a usable no-auth API, official source
validation, repeatable live e2e coverage, persistence/offline replay, and no
credential workaround. Science & Math providers also require review for code
execution, proxying, binary rendering, public-safety, health, and restricted
content risk before exposing CLI operations.

## Official Source Review

The listed URL `https://api.arcsecond.io/` returned an HTML landing page for
Arcsecond APIs. The page links to `/schema`, `/schema/swagger/`, and
`/schema/redoc/` as official OpenAPI/Swagger descriptions. All three schema
links returned HTTP 404 HTML in this runtime.

The official Arcsecond CLI documentation says authentication relies on
Arcsecond keys. It shows login with a username plus either an access key or
upload key, and warns that Access Keys are powerful and not scoped. The
official CLI endpoint wrapper requires a local access or upload key before
normal resource requests and sends `X-Arcsecond-API-Authorization` when a key
exists.

## Live Probe Evidence

All probes were executed from this repository environment on 2026-05-10.

- `GET https://api.arcsecond.io/` returned HTTP 200 `text/html`.
- `GET https://api.arcsecond.io/schema` returned HTTP 404 `text/html`.
- `GET https://api.arcsecond.io/schema/swagger/` returned HTTP 404
  `text/html`.
- `GET https://api.arcsecond.io/schema/redoc/` returned HTTP 404 `text/html`.
- `GET https://api.arcsecond.io/observingsites/` returned HTTP 401 JSON with
  `WWW-Authenticate: Bearer`.
- `GET https://api.arcsecond.io/telescopes/` returned HTTP 401 JSON with
  `WWW-Authenticate: Bearer`.
- `GET https://api.arcsecond.io/observations/`, `/targets/`, and `/datasets/`
  returned HTTP 401 JSON requiring credentials.
- `GET https://api.arcsecond.io/instruments/?limit=2` returned HTTP 200 JSON,
  but this partial open endpoint is not enough to override the official
  authenticated resource contract.

Deep-research evidence:

- `evidence_7157a6db7edb40be8c79ea12dbbc3711`
- `evidence_b8874c63952c45409704ae12e88588d3`
- `evidence_0f8ea3d02ca34853b7226e6e638f4db2`
- `evidence_c2a5a08c79814cc5929f17f279a86964`
- `evidence_eb01bd932a5b48acb8de49679aba2c55`

## Risk and Boundary Assessment

- No-auth API usability: failed for the documented resource contract.
- Official schema availability: failed; linked OpenAPI/Swagger paths are stale.
- Credential boundary: blocked; official docs require access or upload keys.
- Safety risk: no code-execution or binary-rendering risk was found, but the
  provider cannot be exposed without credential support.
- Workaround boundary: implementing only a partially open, undocumented
  `/instruments/` endpoint would be a guessed partial integration.

## Decision

Mark `arcsecond.io` as blocked with `auditStatus: n/a`. No provider module,
registry entry, endpoint catalog record, renderer, live e2e test, or persistence
seed was added.

## Validation

- Task table synchronized to `blocked`.
- Runtime CLI audit was not applicable because no implementation artifacts were
  created.
- Live e2e and offline replay were not applicable because the official no-auth
  resource contract could not be validated.

## Residual Uncertainty

Some individual resources may remain publicly readable. Revisit only if the
official schema is restored or provider docs explicitly identify stable no-auth
resources that can be integrated without keys, account setup, or guessed
endpoint selection.
