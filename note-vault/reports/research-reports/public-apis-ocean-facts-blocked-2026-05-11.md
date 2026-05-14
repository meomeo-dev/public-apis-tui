# Ocean Facts Provider Development Decision - Blocked

- Provider: Ocean Facts
- Category: Science & Math
- Backlog line: 1456
- Catalog URL: https://oceanfacts.herokuapp.com/
- Date: 2026-05-11
- Decision: blocked
- Research ID: research_3a8a28e1a6024fe5aa6f92ed7e0f45ab
- Artifact ID: artifact_dda77fd5f8a34b4a949a2c671fb88a15

## Workflow Context

Tire1.6 development requires a usable no-auth API, official source
validation, repeatable live e2e coverage, persistence/offline replay, and no
browser clickstream or credential workaround. Science & Math providers also
require review for code execution, proxying, binary rendering, public-safety,
health, and restricted-content risk before exposing CLI operations.

## Official Source Review

The listed backlog URL `https://oceanfacts.herokuapp.com/` no longer serves an
Ocean Facts application. HTTPS and HTTP probes returned the Heroku router
`No such app` HTML error page, so the listed official source cannot support a
provider contract, endpoint catalog, live e2e, or offline replay seed.

A successor site at `https://oceanfacts.tropicbliss.net/` documents JSON API
endpoints and live probes confirmed JSON responses. However, the same site's
About page credits the fact author and asks readers not to distribute the
facts without that author's permission. Exposing those facts through this CLI
would redistribute the dataset, so this remains a permission and compliance
blocker without human approval from the rights holder.

## Live Probe Evidence

All probes were executed from this repository environment on 2026-05-11.

- `GET https://oceanfacts.herokuapp.com/` returned HTTP 404 `text/html` with
  a Heroku `No such app` error page.
- `GET http://oceanfacts.herokuapp.com/` returned HTTP 404 `text/html` with
  the same Heroku `No such app` error page.
- `GET https://oceanfacts.herokuapp.com/api` returned HTTP 404 `text/html`
  with the same Heroku `No such app` error page.
- `GET https://oceanfacts.herokuapp.com/random` returned HTTP 404 `text/html`
  with the same Heroku `No such app` error page.
- `GET https://oceanfacts.herokuapp.com/facts` returned HTTP 404 `text/html`
  with the same Heroku `No such app` error page.
- `GET https://oceanfacts.tropicbliss.net/apidocs` returned HTTP 200
  `text/html` documenting `GET /api`, `GET /api/[id]`, and
  `GET /api/random`.
- `GET https://oceanfacts.tropicbliss.net/about` returned HTTP 200
  `text/html` with a distribution notice for the fact content.
- `GET https://oceanfacts.tropicbliss.net/api/random` returned HTTP 200
  `application/json` with one fact object and a `picture` array.
- `GET https://oceanfacts.tropicbliss.net/api/1` returned HTTP 200
  `application/json` with one fact object and a `picture` array.
- `GET https://oceanfacts.tropicbliss.net/api` returned HTTP 200
  `application/json` with a large fact array and `picture` arrays.

Deep-research evidence:

- `evidence_a7e4d8831a1c439dac92be0f15a34cd1`
- `evidence_75d83a50639f4aac8b18dbf35d5534e8`
- `evidence_82db915cec8e469cab640b18a32c56c7`
- `evidence_c828e79566174a3e8611d09d079dbae6`
- `evidence_3ca296a6e6fe42949fa3bc78800286f4`

## Risk and Boundary Assessment

- Listed source usability: failed; the Heroku app is gone.
- Successor API structure: present, but not the listed backlog source.
- Auth requirement: no auth observed for the successor JSON endpoints.
- Distribution risk: elevated; the successor site asks users not to distribute
  the fact content without permission.
- Binary/base64 risk: no base64 payloads were observed, but picture URLs can
  point to external image assets and were not needed for a safe text provider.
- Science & Math safety: no code execution or proxying surface was observed.
- Workflow fit: failed; unresolved permission risk prevents default CLI
  exposure and persistence of redistributed fact payloads.

## Decision

Mark `Ocean Facts` as blocked with `auditStatus: n/a`. No provider module,
registry entry, endpoint catalog record, renderer, live e2e test, or
persistence seed was added.

## Validation

- Task table synchronized to `blocked`.
- Runtime CLI audit was not applicable because no implementation artifacts were
  created.
- Live e2e and offline replay were not applicable because the provider is
  blocked before implementation.

## Residual Uncertainty

The original Heroku application could be redeployed, or the successor site's
rights holder could grant redistribution permission. Revisit only after the
listed or canonical source provides repeatable no-auth structured responses
and clear permission for CLI display, persistence, and offline replay.
