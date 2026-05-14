# Penguin Publishing Provider Development Decision - Blocked

- Provider: Penguin Publishing
- Category: Books
- Backlog line: 262
- Catalog URL: http://www.penguinrandomhouse.biz/webservices/rest/
- Date: 2026-05-11
- Decision: blocked
- Research ID: research_3dd5a3d8166645c6b95099553e9a1d86
- Artifact ID: artifact_6fa187a6d37440bdbc5d38050b203315
- Evidence:
  - `evidence_8f8410a837ab4ff3a878cd42fcaf1474`
  - `evidence_b3ca70826cad4ead9f4b1ae8888766e0`

## Workflow Context

Tire1.6 development requires a usable no-auth API, official source
validation, repeatable live e2e coverage, persistence/offline replay, and no
browser clickstream or credential workaround. Books providers can be
implemented when stable no-auth JSON, XML, Atom, or comparable structured
endpoints are available without account setup or credentials.

## Official Source Review

The listed URL redirects to HTTPS and serves the official Penguin Random House
Rest Services API documentation. The page documents authors, works, titles,
and author events endpoints that can return XML, JSON, or cover images.

The same documentation explicitly states that all RHRS requests are secured by
BASIC HTTP authentication over HTTPS. Its curl, PHP, and Java examples all use
Basic authentication with username/password sample values. This contradicts
the no-auth backlog requirement.

## Live Probe Evidence

All probes were executed from this repository environment on 2026-05-11. No
credentials were sent.

- `GET http://www.penguinrandomhouse.biz/webservices/rest/` redirected to
  HTTPS and returned HTTP 200 `text/html` documentation.
- `GET https://www.penguinrandomhouse.biz/webservices/rest/` returned HTTP
  200 `text/html` documentation.
- `GET https://www.penguinrandomhouse.biz/webservices/rest/resources/authors`
  with query parameters returned HTTP 404 `text/html`.
- Similar no-credential resource probes for works, titles, and title detail
  under the listed host returned HTTP 404 `text/html`.
- No-credential HTTPS probes to the documented sample host
  `reststop.randomhouse.com` closed during TLS handshake.
- No-credential HTTP probes to `reststop.randomhouse.com` returned empty
  replies.

## Risk and Boundary Assessment

- No-auth API usability: failed; official docs require Basic HTTP auth.
- Credential risk: high; implementing would require username/password support.
- Live e2e readiness: failed; no repeatable no-auth JSON/XML response exists.
- HTML-as-data risk: present on listed-host resource probes.
- Books safety: no content safety issue was identified, but the auth boundary
  alone blocks this no-auth workflow.

## Decision

Mark `Penguin Publishing` as blocked with `auditStatus: n/a`. No provider
module, registry entry, endpoint catalog record, renderer, live e2e test, or
persistence seed was added.

## Validation

- Official docs and live probes recorded.
- Task table synchronized to `blocked`.
- Runtime CLI audit was not applicable because no implementation artifacts were
  created.
- Live e2e and offline replay were not applicable because the provider cannot
  be used as a no-auth API.

## Residual Uncertainty

Penguin Random House REST services may still be usable for approved users with
Basic authentication credentials. Revisit only under a keyed-provider workflow
that stores credentials in local provider config, redacts secrets everywhere,
and receives explicit product approval for a credentialed Books provider.
