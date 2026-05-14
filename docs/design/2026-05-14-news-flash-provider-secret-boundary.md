# News Flash Provider Secret Boundary

## Context

`public-apis-cli@0.7.2` exposed two source-level defects during global
`news-flash` installation.

The `thenews-flash` template mapped result items from `data`, while the CLI
operation returns articles under `articles`. Smoke execution could fetch
articles, but template normalization reduced them to zero items.

The `news-flash install` path accepted `--agent-env-file`, but generated
LaunchAgent plist commands still included a fallback that reads local provider
config and exports the provider API key. This made scheduled runs work, but it
crossed the requested credential boundary: key-based providers must reference
the `.env` file only, and plist files must not carry inline API key values or
provider-config fallback export blocks.

## Goals

- Normalize `thenews.all` results from `articles`.
- Preserve key-based provider support without embedding API key values in plist
  content.
- Treat explicit `--agent-env-file` usage as the scheduled-run credential
  source for key-based news providers.
- Add regression coverage for TheNewsAPI item mapping and LaunchAgent secret
  boundary behavior.
- Keep real API keys out of fixtures, generated plist tests, logs, and git
  history.

## Non-Goals

- Do not reconfigure local LaunchAgents as part of the source fix.
- Do not require live news API calls for regression tests.
- Do not remove local provider config support from normal CLI provider
  execution.
- Do not publish a new npm version in this change.

## Options

### Option 1: Patch installed global package only

This fixes the local machine temporarily, but the bug remains in the repository
and the next npm install can restore the defect.

### Option 2: Remove provider config fallback everywhere

This creates a simple credential boundary, but it breaks existing users who
expect local provider config to satisfy keyed provider preflight or unscheduled
CLI calls.

### Option 3: Gate LaunchAgent provider-secret fallback by install mode

Keep local provider config as a supported source for interactive checks and
legacy installs, but avoid generating the provider-config fallback block when
the scheduled runner is explicitly configured with `--agent-env-file`.

## Decision

Use Option 3.

The repository should fix `thenews-flash/provider-config.mjs` so
`itemArrayPath` and `normalize()` read `articles`, with a narrow compatibility
fallback only if that does not hide malformed smoke output.

The LaunchAgent generator should receive enough context to know whether an
agent env file was explicitly configured. When it was, generated plist content
must source that file through the existing agent env mechanism, clear the
provider key before runner startup, and must not include provider-config
fallback logic for the keyed provider.

Preflight can continue to accept shell environment or local provider config
for legacy installs. When `--agent-env-file` is explicit, the keyed provider
check should validate that file path instead of falling back to local provider
config. The scheduled command is the stricter boundary: no inline provider API
key assignment and no node snippet that reads provider config for API key
export.

## Risks

- Existing users without `--agent-env-file` may still rely on local provider
  config fallback for scheduled runs. The implementation must either preserve
  that path or document any behavior change.
- A partial fix can leave smoke checks passing while scheduled LaunchAgents
  still lose credentials at runtime.
- Plist regression tests can accidentally assert on synthetic secret values.
  Test values must be fake and must verify absence from plist output.
- Package verification must include the updated templates, otherwise npm
  artifacts can diverge from repository source.

## Test Plan

- Run the targeted TheNewsAPI template test:
  ```bash
  (
    cd experimental/public-apis-news-flash-monitor/template/thenews-flash
    node --test test/template.test.mjs
  )
  ```
- Run the targeted news flash CLI tests:
  `node --no-warnings --import tsx --test test/experimental-news-flash.test.ts`.
- Add or update tests that assert:
  - `providerConfig.normalize()` returns items from an `articles` fixture.
  - `createLaunchAgentPlist()` with `provider: 'thenews'` and
    `agent.envFile` includes `AGENT_ENV_FILE`.
  - The same plist unsets `THENEWSAPI_API_KEY` before the agent env file is
    sourced by the runner.
  - The same plist does not contain provider API key assignment,
    `config.json`, or the provider-config fallback node snippet.
  - `doctorNewsFlashMonitor()` accepts the provider key from
    `--agent-env-file` without using local provider config fallback.
- Run `npm run build:package` and `npm run package:verify` before release
  readiness, because the affected files are npm package contents.

## Rollback Plan

- Revert the source commit that changes the TheNewsAPI template and
  LaunchAgent generation.
- If local scheduled runs are affected before a package release, unload the
  affected LaunchAgent, restore the prior plist from local backup or reinstall
  with the previous package version, and verify the plist contains no real
  API key values before loading it.
- Stop release preparation if generated package contents differ from source
  templates or any plist fixture contains API key material.

## Follow-Up

- Next skill: `$we:feature-dev`.
- After implementation, consider `$we:release-readiness` because the fix affects
  npm package contents and public CLI behavior.
- A GitHub issue is recommended if this work needs public tracking or release
  note linkage. It can be skipped for a single local fix branch if the PR body
  links this design note.
