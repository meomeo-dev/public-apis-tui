# Purple Air Provider Development Decision - Blocked

- Provider: Purple Air
- Category: Science & Math
- Backlog line: 1459
- Catalog URL: https://www2.purpleair.com/
- Date: 2026-05-11
- Decision: blocked
- Research ID: research_161f6531054e43a1a9ba26a1e6f9ee63
- Artifact ID: artifact_5031587cf51b47d9a4ba83040d3e4ead
- Evidence:
  - `evidence_5418af16f7df46da9a00837d637dd972`
  - `evidence_4d5a418019d943a7b22ad076eab293af`
  - `evidence_d9ddbb992dea4674b097113165c257d0`
  - `evidence_1921196d3b79465f8796f89db77d039d`
  - `evidence_b15e24da88c2480fb19441cba5af028d`

## Workflow Context

Tire1.6 Science & Math provider development requires a repeatable no-auth
structured API surface. The provider must not require API keys, OAuth,
account setup, cookies, browser clickstream, or credential workarounds.

## Official Source Review

The listed homepage is a Shopify/marketing site for real-time air quality
monitoring. The canonical API documentation is available at
`https://api.purpleair.com/` and identifies the API root as
`https://api.purpleair.com/v1`.

The official apidoc data states that API keys are required for the PurpleAir
API and must be included in every API request. It also states that keys are
created through the Developer Dashboard, that `READ` keys are used for `GET`
requests, and that requests consume API points. The documented request
examples include `X-API-Key` or `api_key`.

## Live Probe Evidence

All probes were executed from this repository environment on 2026-05-11. No
API key, account credential, cookie, or browser session was sent.

- `GET https://www2.purpleair.com/` returned HTTP 200 `text/html` marketing
  content.
- `GET https://api.purpleair.com/` returned HTTP 200 `text/html` API docs.
- `GET https://api.purpleair.com/api_project.js` returned JavaScript metadata
  naming `https://api.purpleair.com/v1` as the API root.
- `GET https://api.purpleair.com/api_data.js` returned JavaScript apidoc data
  documenting key requirements, API points, and sensor endpoints.
- `GET https://api.purpleair.com/v1/sensors` returned HTTP 403
  `application/json` with `ApiKeyMissingError`.
- `GET https://api.purpleair.com/v1/sensors/12345?fields=...` returned HTTP
  403 `application/json` with `ApiKeyMissingError`.
- `GET https://www.purpleair.com/json` redirected to an over-quota App Engine
  host and returned HTTP 500 `text/html`, not a stable JSON API surface.

## Risk and Boundary Assessment

- No-auth API usability: failed; official API requires keys.
- Credential risk: high; implementation would need an API key and dashboard
  account setup.
- Quota/account coupling: present; official docs mention API points and
  per-key rate limiting.
- Browser/clickstream risk: present for map-based alternatives; not used.
- Health/environment data risk: manageable for public data, but irrelevant
  because the no-auth boundary fails first.

## Decision

Mark `Purple Air` as blocked with `auditStatus: n/a`. No provider module,
registry entry, endpoint catalog record, renderer, live e2e test, or
persistence seed was added.

## Validation

- Official docs and live no-key probes recorded.
- Runtime CLI audit was not applicable because no implementation artifacts were
  created.
- Live e2e and offline replay were not applicable because the provider cannot
  be used as a no-auth API.

## Residual Uncertainty

PurpleAir may be usable in a future keyed-provider workflow. That workflow
would need explicit product approval, local secret storage, redaction, quota
handling, and API points documentation before any CLI exposure.
