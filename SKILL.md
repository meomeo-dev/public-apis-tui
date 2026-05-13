---
name: public-apis-tui-creator
description: Build, audit, and maintain this TypeScript CLI/TUI for documented public API providers. Use when adding providers, provider operations, CLI/RPC output, persistence, contract tests, live API checks, README updates, or repository maintenance for public-apis-tui.
---

# Public APIs CLI TUI Skill

Use this repository to build, audit, and maintain a TypeScript CLI/TUI for documented public API providers. Default path: call documented HTTP APIs, normalize data, expose typed CLI/RPC operations, render readable terminal output, and test both JSON contracts and text projections.


## Fast Orientation

| Area | Files |
| --- | --- |
| CLI entry | `src/cli.ts`, `src/interfaces/cli/program.ts` |
| CLI text output | `src/interfaces/cli/output.ts` |
| JSON-RPC server | `src/interfaces/rpc/jsonRpcServer.ts` |
| Provider registry | `src/providers/providerRegistry.ts` |
| Provider manifests | `src/providers/<provider>/index.ts` |
| Use cases | `src/application/usecases/*.ts` |
| HTTP clients | `src/infrastructure/openApis/*Client.ts` |
| Local provider config/cache | `src/infrastructure/persistence/`, `src/shared/runtime/appPaths.ts` |
| Contracts | `specs/public-apis/*.yml`, `specs/cli/cdp-cli-tui.spec.md` |
| Tests | `test/*.test.ts`, `test/contract/*.test.ts`, `test/live-api/*.test.ts` |
| Experimental monitors | `experimental/public-apis-news-flash-monitor/` |

Provider selection and project scope are based on the public-apis catalog.

## Mental Model

A provider has four layers. Keep them separate.

1. **Client**: fetches documented API endpoints and normalizes raw upstream responses.
2. **Use case**: validates input, resolves API keys/config, calls the client, and returns a typed result.
3. **Provider manifest**: declares operations, CLI option exposure, auth metadata, endpoint catalog records, and RPC method IDs.
4. **Interface**: CLI/RPC dispatch and text renderer project the typed result. They should not contain API-specific fetch logic.

If a change crosses all four layers, implement from client upward.

## Core Commands

Install dependencies:

```sh
npm install
```

Run the CLI from source:

```sh
npm run dev -- apis list
npm run dev -- apis info ukpolice
npm run dev -- apis run ukpolice.streetCrimes -- --latitude 51.5074 --longitude -0.1278 --limit 5
```

Show provider-specific operation help:

```sh
npm run dev -- apis run hackernews.stories --help
```

Run JSON output:

```sh
npm run dev -- apis run hackernews.stories --format json -- --list top --limit 5
```

Configure provider secrets locally:

```sh
npm run dev -- apis config newsapi --set-secret NEWSAPI_API_KEY=value
npm run dev -- apis config gnews --set-secret GNEWS_API_KEY=value
```

Build and validate:

```sh
npm run typecheck
npm run lint
npm run spec:validate
npm run test
npm run test:contract
```

Target one test file:

```sh
NODE_NO_WARNINGS=1 node --import tsx --test test/uk-police-client.test.ts
```

Live API tests are opt-in and may hit upstream services:

```sh
PUBLIC_APIS_LIVE_E2E=1 NODE_NO_WARNINGS=1 node --import tsx --test test/live-api/ukpolice.test.ts
```

## Adding Or Changing A Provider

1. Read the relevant contract first: `specs/public-apis/provider-contract.spec.yml`, `specs/public-apis/tui-renderer.spec.yml`, and `specs/public-apis/live-e2e-persistence.spec.yml`.
2. Verify official docs and live endpoint behavior.
3. Add or update the HTTP client under `src/infrastructure/openApis/`.
4. Add or update the use case under `src/application/usecases/`.
5. Add or update `src/providers/<provider>/index.ts` with operation IDs, CLI exposure metadata, auth metadata, and endpoint catalog records.
6. Register the provider in `src/providers/providerRegistry.ts`.
7. Add text rendering in `src/interfaces/cli/output.ts` only after the JSON result shape is stable.
8. Add CLI/RPC tests only after the use case is typed and covered.
9. Add live API coverage or a precise documented skip reason.
10. Update public README or specs when provider behavior changes.

## Provider Contract Rules

- Operation IDs use `provider.operation`, for example `ukpolice.streetCrimes`.
- CLI command paths use provider-friendly names, but the registry operation ID is the stable integration key.
- Every exposed option needs a group and reason.
- `--format json` is the source of truth for automation.
- Text output must be a readable projection of the JSON result.
- Use `RuntimeFailure` for expected user/runtime failures; include remediation when it helps.
- Treat non-JSON HTML, WAF pages, Cloudflare challenges, empty shells, and upstream error pages as failures or blockers.
- API keys belong in environment variables or local provider config. Never hard-code them in source, tests, specs, docs, or examples.

## API Key And Cache Rules

Provider config is stored under `~/.cdp-cli/public-apis-tui/public-apis/<provider>/config.json` unless `SITE_CDP_HOME_DIR` or `PUBLIC_APIS_HOME_DIR` changes the root.

Use these helpers instead of hand-reading config files:

- `readPublicApiProviderConfig`
- `writePublicApiProviderConfig`
- `showPublicApiProviderConfig`
- `resolvePublicApiProviderStoragePaths`

Secrets must print as `<redacted>`. Cache databases are local artifacts and should not be committed.

For keyed providers, prefer this resolution order when applicable:

1. explicit operation option such as `--api-key`;
2. environment variable such as `NEWSAPI_API_KEY`;
3. local provider config written by `apis config`.

## Text Output Rules

Readable output should answer five questions quickly:

1. Which provider and endpoint ran?
2. Was auth required?
3. What query was used?
4. How many records came back?
5. What should the user run next?

Keep output bounded. Large API responses need limits, summaries, or next commands.

## Experimental News Flash Rules

The news flash monitor lives under `experimental/public-apis-news-flash-monitor/`.

Lifecycle:

```sh
npm run dev -- experimental news-flash providers
npm run dev -- experimental news-flash doctor --provider hackernews
npm run dev -- experimental news-flash run-once --provider hackernews
npm run dev -- experimental news-flash install --provider hackernews --interval-minutes 30
npm run dev -- experimental news-flash status
npm run dev -- experimental news-flash uninstall --provider hackernews
```

Rules:

- `install` must run preflight checks and a real smoke run before writing/loading a LaunchAgent.
- Provider-specific CLI flags are the only parameter surface.
- Keyed news providers must accept either shell environment secrets or local provider config secrets.
- LaunchAgent plist files must not embed secret values.
- Notifications should open the generated TXT when clicked. Do not auto-open it.
- Generated `data/`, `summary/`, and `logs/` directories are local artifacts. Clean them before committing.

Run template tests:

```sh
for dir in experimental/public-apis-news-flash-monitor/template/*-flash; do (cd "$dir" && node --test test/*.test.mjs); done
NODE_NO_WARNINGS=1 node --import tsx --test test/experimental-news-flash.test.ts
NODE_NO_WARNINGS=1 node --import tsx --test --test-name-pattern 'experimental news flash' test/cli-program.test.ts
```

## Files And Directories To Treat As Local Or Generated

- `dist/`: build output.
- `coverage/`: test output.
- `tmp/`: ignored probe/audit scratch data.
- `node_modules/`: dependency install output.
- Local research archives, workflow state, and private agent configuration stay
  out of the public repository.
- `.cdp-cli`, `.site-cdp`, `browser-profile`, `browser-sessions`, `auth`: local browser/session state.

## Validation Policy

Use the narrowest validation first, then widen.

Provider/client change:

```sh
NODE_NO_WARNINGS=1 node --import tsx --test test/<provider>-client.test.ts
npm run typecheck
npm run lint
```

CLI output change:

```sh
NODE_NO_WARNINGS=1 node --import tsx --test test/cli-output.test.ts
NODE_NO_WARNINGS=1 node --import tsx --test test/cli-program.test.ts
```

Registry/RPC change:

```sh
NODE_NO_WARNINGS=1 node --import tsx --test test/contract/json-rpc.test.ts
npm run spec:validate
```

Before handoff or commit, prefer:

```sh
npm run typecheck
npm run lint
npm run spec:validate
npm run test
npm run test:contract
```

Report unrelated test failures separately.

## Documentation Rules

- README is for users. Keep it direct, command-first, and screenshot-ready.
- `SKILL.md` is for coding agents. Keep it procedural and terse.
- `experimental/*/SKILL.md` documents reusable experimental methods.
- Use screenshot placeholders only when a human still needs to capture images.
- Keep README license text aligned with `LICENSE` and `package.json`.

## Failure Handling

- If a provider returns Cloudflare/WAF/challenge HTML, mark it as upstream challenge behavior.
- If an API key is missing, support `apis config <provider> --set-secret NAME=value` when the provider already supports local config.
- If CLI help becomes confusing, inspect `src/interfaces/cli/program.ts` before changing provider code.
- If text output is wrong but JSON is right, fix `src/interfaces/cli/output.ts`.
- If JSON is wrong, fix the client or use case first.
- If generated artifacts appear after a smoke run, remove `data/`, `summary/`, and `logs/` before committing.
