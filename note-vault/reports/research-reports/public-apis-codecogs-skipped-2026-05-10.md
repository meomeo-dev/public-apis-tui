# CodeCogs Provider Development Decision - Skipped

- Provider: CodeCogs
- Category: Science & Math
- Backlog line: 1439
- Catalog URL: https://editor.codecogs.com/docs/4-LaTeX_rendering.php
- Date: 2026-05-10
- Decision: skipped
- Research ID: research_9cd1b6d5bc4147c5967da20b28413c0e
- Artifact ID: artifact_1aad704f6c6c4e07bb1029951b33c1b4

## Workflow Context

The Tire1.6 development workflow requires a usable no-auth API, official source
validation, repeatable live e2e coverage, persistence/offline replay, and no
browser clickstream or credential workaround. Science & Math providers also
require review for code execution, proxying, binary rendering, base64 dumps,
public-safety, health, and restricted-content risk before exposing CLI
operations. The workflow explicitly excludes image-only, binary-only,
base64-only, and warning-as-data APIs.

## Official Source Review

The official CodeCogs LaTeX rendering documentation defines the request shape
as `https://latex.codecogs.com/{type}.{format}?{LaTeX}`. The documented
`type` values are graphical output formats: `png`, `gif`, `svg`, `emf`, and
`pdf`. The documented `format` values include `image`, `json`, `javascript`,
and `download`.

The JSON format is not a structured mathematics data API. It is a rendering
wrapper that returns metadata for the rendered equation plus a base64-encoded
image payload.

## Live Probe Evidence

All probes were executed from this repository environment on 2026-05-10.

- `GET https://latex.codecogs.com/png.json?...` returned HTTP 200 `text/json`.
  The response included `type: "png"`, `valid: true`, the rendered equation,
  an image URL, and a `base64` PNG payload.
- `GET https://latex.codecogs.com/svg.json?...` returned HTTP 200 `text/json`
  with a base64 SVG rendering payload.
- `GET https://latex.codecogs.com/gif.json?...` returned HTTP 200 `text/json`
  with rendered-image dimensions and a base64 GIF payload.
- `GET https://latex.codecogs.com/png.json?%5Cnotacommand%7B` returned HTTP
  400 `text/json`. The response still included `error: "Invalid Equation"`,
  an image URL, and a base64 PNG error-image payload.
- `GET https://latex.codecogs.com/pdf.download?x%3D1` returned HTTP 200
  `application/octet-stream` with an attachment filename `CodeCogsEqn.pdf`;
  the saved response was a PDF 1.7 binary document.

Deep-research evidence:

- `evidence_e8519a9a6e1449b9867910cae7974752`
- `evidence_f53e6923fdd149bb96e9553d04aafb21`
- `evidence_23dcb93cc9b04e44940322ffe5cd733a`
- `evidence_11f1af2485e54df29a4716ebf730f99f`

## Risk and Boundary Assessment

- No-auth availability: present, but only for rendering surfaces.
- Structured data value: failed; JSON wraps image rendering data.
- Binary/base64 risk: failed; the useful payload is image or download data.
- Error handling: invalid equations still return an error image as data.
- CLI/TUI fit: failed; exposing this would encourage base64 or binary dumps
  rather than structured JSON-to-text projection.
- Workaround boundary: implementing only URL construction would be a rendering
  helper, not a public structured API integration.

## Decision

Mark `CodeCogs` as skipped with `auditStatus: n/a`. No provider module,
registry entry, endpoint catalog record, renderer, live e2e test, or
persistence seed was added.

## Validation

- Task table synchronized to `skipped`.
- Runtime CLI audit was not applicable because no implementation artifacts were
  created.
- Live e2e and offline replay were not applicable because the provider is
  intentionally outside the safe structured-data boundary.

## Residual Uncertainty

CodeCogs may remain useful as a rendering service for humans or web pages.
Revisit only if CodeCogs publishes a stable no-auth endpoint that returns
safe structured mathematical data without image, binary, or base64 payloads as
the core value.
