# Changelog

## 0.7.3 - 2026-05-14

- Fix the TheNewsAPI news-flash template so collected `thenews.all` articles
  are normalized from the CLI `articles` result field.
- Tighten key-based news-flash LaunchAgent installs that use
  `--agent-env-file` so scheduled runs source provider API keys from that file
  instead of generating local provider-config fallback export blocks.
- Add regression coverage for news-flash plist credential boundaries and
  agent env-file provider key preflight.

## 0.7.2 - 2026-05-14

- Add cost-controlled GitHub Actions release preflight with separate Linux and
  Windows jobs so platform validation can run independently.
- Clarify WE skill routing for CI maintenance, release preparation, npm
  publishing, and project-local help.
- Standardize npm script names for release gates while keeping backward
  compatible aliases for existing development commands.
- Document npm tarball naming, GitHub Release artifact guidance, and release
  version/tag ownership.

## 0.7.1 - 2026-05-13

- Harden news-flash runtime templates for global npm installs by resolving the
  packaged `public-apis` CLI before falling back to source development commands.
- Make installer smoke checks fail when the collector records a failed run or
  returns no collected items.
- Isolate each news-flash run window with a run id so same-day summaries do not
  mix old provider settings, failed records, and current results.
- Improve news-flash status reporting by reading installed LaunchAgent working
  directory and repo environment values when available.

## 0.7.0 - 2026-05-13

- Add news-flash templates for Chronicling America, Currents, The Guardian,
  MarketAux, Mediastack, NewsData.io, New York Times, and TheNewsAPI.
- Add configurable news-flash agent runners for Claude Code and Codex, including
  environment-file loading, Codex profile selection, and provider API key
  bridging.
- Show provider secret key names in `public-apis apis config <provider> --help`
  so users know which environment variables or config secrets to set.
- Add incremental test commands for focused development while keeping full
  regression checks available for release gates.
- Add project-local WE skills for feature development, npm publishing, skill
  maintenance, and parallel worktree development.

## 0.6.0 - 2026-05-12

- Add and audit the Tire1.6 public API provider batch, including arXiv,
  Church Calendar, GBIF, GurbaniNow, iDigBio, INSPIRE HEP, ISRO, ITIS,
  Launch Library 2, LectServe, NASA, OSF, SHARE, SpaceX, USGS, Wizard
  World, World Bank, and related science/reference providers.
- Add gated live e2e coverage, endpoint catalog records, JSON-RPC coverage,
  text renderers, persistence/offline replay checks, and challenge HTML
  handling for the new provider batch.
- Add the Tire1.6 development workflow and record blocked/skipped upstream API
  decisions for unsafe, stale, credentialed, or unreachable providers.
- Tighten experimental news-flash package assets and package verification so
  the npm tarball contains only approved runtime files and templates.
- Add the repository-local `we:release` skill for repeatable release
  preparation without publishing automatically.
- Publish package metadata against the public GitHub repository and switch the
  project license to MIT.

## 0.5.3 - 2026-05-10

- Expose the experimental command group in top-level CLI help while keeping
  internal browser, auth, profile, site inspection, and session commands hidden.

## 0.5.2 - 2026-05-10

- Hide template browser, CDP, auth, profile, site inspection, and session
  commands from top-level CLI help while preserving direct command access.
- Hide browser automation global options from top-level help while preserving
  option parsing for internal and compatibility workflows.

## 0.5.1 - 2026-05-10

- Prepare npm publication metadata with public package access and
  `UNLICENSED` license metadata.
- Add `public-apis version` for checking the installed CLI version.
- Tighten package verification so npm artifacts include only the bundled CLI,
  user documentation, required images, license notice, changelog, and package
  metadata.
- Rewrite README files for npm users and remove repository-only workflow
  guidance from the published docs.

## 0.4.0 - 2026-05-02

- Add a CDP CLI template plan for UX mode, output format, lifecycle,
  login-state, and profile-hardening boundaries.
- Default command-mode browser runs headless while `auth login` stays headed
  for human-delegated login.
- Move default managed browser state under `~/.cdp-cli/<package-name>` with
  `SITE_CDP_HOME_DIR` override support.
- Add owner-only directory hardening for managed auth profiles and browser sessions.
- Fail early with `AUTH_PROFILE_NOT_READY` for login-required site commands
  when the managed auth profile is missing.
- Tighten readiness checks and clone only `Local State` plus the selected
  Chrome profile directory.
- Document downstream guardrails for readable TUI projection,
  dependency/security review, and profile handling.

## 0.3.0 - 2026-05-01

- Switch managed browser launch to `puppeteer-extra` with
  `puppeteer-extra-plugin-stealth`.
- Remove default `--enable-automation` and add
  `--disable-blink-features=AutomationControlled` for owned Chrome launches.
- Add local browser profile consistency controls for timezone, locale, UA,
  viewport, geolocation, headers, and proxy.
- Add optional local interaction pacing controls for hover, scroll-into-view,
  click delay, and typing/key delays.
- Add local session export/import commands and RPC methods for cookies and localStorage.
- Wire auth profile `userDataDir` and profile defaults into effective browser
  runtime selection.
- Add dedicated local auth profile login/logout flows plus managed
  profile clone/show commands for multi-site local browser reuse.
- Document updated anti-fingerprint guidance for approved QA and browser-based
  LLM usage.

## 0.2.0 - 2026-04-30

- Add multi-site registry support with per-site auth metadata and workflow plans.
- Add endpoint catalog and sanitized network observation surfaces.
- Add semantic element introspection and guarded simulated UI actions.
- Expose site, workflow, endpoint, and network inspection surfaces through CLI
  and JSON-RPC.

## 0.1.0 - 2026-04-30

- Scaffold a reusable TypeScript CDP CLI template.
- Add browser attach/launch runtime boundaries.
- Add generic site adapter, CLI commands, and JSON-RPC transport.
- Add spec validation, package verification, and release preflight checks.
- Add `init-site` helper for deriving website-specific CLI repositories.
