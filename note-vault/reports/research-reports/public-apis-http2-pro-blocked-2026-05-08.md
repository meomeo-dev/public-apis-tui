# HTTP2.Pro Provider Development Decision — Blocked

- Provider: HTTP2.Pro
- Category: Development
- Backlog line: 532
- Catalog URL: https://http2.pro/doc/api
- Date: 2026-05-08
- Decision: blocked
- Artifact ID: artifact_3a8b6473ecf948e5add55f3101b425d3

## Workflow Context

The Tire1.5 development workflow requires a usable no-auth API, official documentation/source evidence, repeatable live e2e coverage, persistence/offline replay, and no restricted-content exposure in the CLI. Development/Security-adjacent providers also require additional privacy, abuse, and compliance review before exposing commands.

## Official Source Review

The catalog URL no longer resolves to HTTP2.Pro API documentation. `GET https://http2.pro/doc/api` returns a Cloudflare HTTP 301 to `https://payrollservices.uk.com/doc/api`, which then redirects to `https://payrollservices.uk.com`. The resulting page is a WordPress/AMP gambling and casino landing page in Vietnamese, with metadata and body content about betting sites rather than HTTP/2 tests.

Because the official source is no longer the expected API documentation and now points to restricted-content-adjacent material, it cannot be safely exposed as a CLI integration.

## Live Probe Evidence

All probes were executed from this repository environment on 2026-05-08.

| Probe | Result | Content-Type | Evidence |
|---|---:|---|---|
| `GET https://http2.pro/` | 301 then 200 | `text/html; charset=UTF-8` | redirected to `https://payrollservices.uk.com/` gambling landing page |
| `GET https://http2.pro/doc/api` | 301 then 301 then 200 | `text/html; charset=UTF-8` | redirected to `payrollservices.uk.com/doc/api`, then root gambling page |
| `GET https://http2.pro/api` | 301 chain then 200 | `text/html; charset=UTF-8` | redirected page, no JSON API response |
| `GET https://http2.pro/api/v1` | 301 chain then 200 | `text/html; charset=UTF-8` | redirected page, no JSON API response |
| `GET https://http2.pro/api/v1/check?url=https%3A%2F%2Fexample.com` | 301 chain then 200 | `text/html; charset=UTF-8` | redirected page, no JSON API response |
| `GET https://http2.pro/api/v1/server?url=https%3A%2F%2Fexample.com` | 301 chain then 200 | `text/html; charset=UTF-8` | redirected page, no JSON API response |
| `GET https://http2.pro/api/v1/client` | 301 chain then 200 | `text/html; charset=UTF-8` | redirected page, no JSON API response |

Representative response bodies started with `<!DOCTYPE html>` and page metadata such as `Top 10 Nhà Cái Uy Tín 05/2026`, confirming that responses are not API payloads.

## Risk and Boundary Assessment

- No-auth API usability: failed; no machine-readable HTTP/2 testing response is available.
- Restricted-content risk: unacceptable for a general CLI provider because the current official URL resolves to gambling/casino promotional content.
- Abuse/security risk: HTTP/2 protocol probing could be dual-use if it accepted arbitrary targets, but implementation did not proceed because source and endpoint validation failed first.
- Workaround boundary: no browser scraping, content extraction, or alternate undocumented endpoint guessing is allowed.

## Decision

Mark `HTTP2.Pro` as blocked with `auditStatus: n/a`. No provider module, registry entry, endpoint catalog record, renderer, persistence seed, or CLI exposure was added.

## Validation

- Task table synchronized to `blocked`.
- Catalog JSON synchronized to `status: blocked` and `auditStatus: n/a`.
- Runtime CLI audit and live e2e persistence were not applicable because no implementation artifacts were created and no repeatable API endpoint exists.

## Residual Uncertainty

If HTTP2.Pro is restored at a safe official domain with documented no-auth JSON endpoints, rerun the development workflow from the research gate and reassess arbitrary-target probing risk before exposing commands.
