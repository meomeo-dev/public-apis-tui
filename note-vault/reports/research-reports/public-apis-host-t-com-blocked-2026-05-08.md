# host-t.com Provider Development Decision — Blocked

- Provider: host-t.com
- Category: Development
- Backlog line: 530
- Catalog URL: https://host-t.com
- Date: 2026-05-08
- Decision: blocked
- Artifact ID: artifact_74e319e07a67483099106d14e847e6dc

## Workflow Context

The Tire1.5 development workflow requires a usable no-auth API with repeatable live e2e coverage, JSON/text CLI output, persistence, offline replay, and no browser clickstream or credential workaround.

## Official Source Review

The listed URL currently redirects from `https://host-t.com` to `https://dnsviahttp.com`. The landing page title is "DNS via HTTP" and describes "Extremely simple DNS lookup" / "Get A-records without a hassle!". The page contains an HTML form with `method="post"`, `qname`, and hidden `qtype=A`.

The same page also contains an "API Launch" modal and launch notification form that says the API is not ready yet. This contradicts the backlog description of a ready HTTP GET API.

## Live Probe Evidence

All probes were executed from this repository environment on 2026-05-08.

| Probe | Result | Content-Type | Evidence |
|---|---:|---|---|
| `GET https://host-t.com` | 301 then 200 | `text/html; charset=utf-8` | redirects to `https://dnsviahttp.com` and returns the HTML landing page |
| `GET https://host-t.com/api` | 301 then 200 | `text/html; charset=utf-8` | same HTML landing page, no API response |
| `GET https://host-t.com/api?host=example.com` | 301 then 200 | `text/html; charset=utf-8` | same HTML landing page, no API response |
| `GET https://host-t.com/dns?host=example.com` | 301 then 200 | `text/html; charset=utf-8` | same HTML landing page, no API response |
| `GET https://host-t.com/lookup?host=example.com` | 301 then 200 | `text/html; charset=utf-8` | same HTML landing page, no API response |
| `GET https://host-t.com/?name=example.com&type=A` | 301 then 200 | `text/html; charset=utf-8` | same HTML landing page, no API response |
| `POST https://dnsviahttp.com/ qname=example.com&qtype=A` | 200 | `text/html; charset=utf-8` | returns the HTML landing page even with `Accept: application/json` |

Representative response headers included `x-ingress-node: net-1` and no JSON content type. Representative response bodies started with `<!DOCTYPE html>`.

## Risk and Boundary Assessment

- No credentials are exposed or required by the observed HTML page.
- The API launch waitlist requires email submission through a third-party form; account/signup/email workflows are outside the no-auth provider boundary.
- Implementing by scraping the HTML form or signing up for launch notifications would violate the open-API-only workflow guardrails.

## Decision

Mark `host-t.com` as blocked with `auditStatus: n/a`. No provider module, registry entry, CLI command, persistence seed, or renderer changes were added because there is no repeatable no-auth JSON/API endpoint to validate.

## Validation

- Task table synchronized to `blocked`.
- Catalog JSON synchronized to `status: blocked` and `auditStatus: n/a`.
- No runtime CLI audit was applicable because no implementation artifacts were created.
- No live e2e/offline replay was possible because all candidate endpoints returned HTML rather than JSON/API data.

## Residual Uncertainty

The service may launch an API in the future. Revisit only if official documentation publishes a stable no-auth endpoint with machine-readable responses and clear request/response contract.
