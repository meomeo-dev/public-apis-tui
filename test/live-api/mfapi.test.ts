import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const liveEnabled = process.env.PUBLIC_APIS_LIVE_E2E === '1'

type PublicApiMeta = { provider: string; authentication: string; usesBrowserClickstream: boolean }
type StorageMeta = { mode?: string | undefined; persisted?: boolean | undefined }

type SearchResult = Record<string, unknown> & {
  kind: 'mfapi.search'
  api: PublicApiMeta
  schemes: Array<{ schemeCode: number; schemeName: string }>
  storage: StorageMeta
}

type LatestResult = Record<string, unknown> & {
  kind: 'mfapi.latest'
  api: PublicApiMeta
  fund: { schemeCode?: number; schemeName?: string }
  nav?: { date: string; nav: number }
  storage: StorageMeta
}

test('MFapi live search verifies JSON and offline text replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<SearchResult>(['apis', 'run', 'mfapi.search', '--online', '--persist', '--format', 'json', '--', '--query', 'SBI Small Cap', '--limit', '100'], env)
    assert.equal(online.kind, 'mfapi.search')
    assert.equal(online.api.provider, 'mfapi')
    assert.equal(online.api.authentication, 'none')
    assert.equal(online.api.usesBrowserClickstream, false)
    assert.ok(online.schemes.length > 0)
    assert.equal(online.storage.persisted, true)

    const offline = await runJson<SearchResult>(['apis', 'run', 'mfapi.search', '--offline', '--format', 'json', '--', '--query', 'SBI Small Cap', '--limit', '100'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.schemes, online.schemes)

    const text = await runCli(['apis', 'run', 'mfapi.search', '--offline', '--format', 'text', '--', '--query', 'SBI Small Cap', '--limit', '100'], env)
    assert.match(text.stdout, /Indian Mutual Fund Search/)
    assert.match(text.stdout, /open REST API only · no auth/)
  })
})

test('MFapi live latest verifies JSON and offline text replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<LatestResult>(['apis', 'run', 'mfapi.latest', '--online', '--persist', '--format', 'json', '--', '--scheme-code', '125497'], env)
    assert.equal(online.kind, 'mfapi.latest')
    assert.equal(online.api.provider, 'mfapi')
    assert.equal(online.api.authentication, 'none')
    assert.equal(online.api.usesBrowserClickstream, false)
    assert.equal(online.fund.schemeCode, 125497)
    assert.ok(online.nav?.nav)
    assert.equal(online.storage.persisted, true)

    const offline = await runJson<LatestResult>(['apis', 'run', 'mfapi.latest', '--offline', '--format', 'json', '--', '--scheme-code', '125497'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.nav, online.nav)

    const text = await runCli(['apis', 'run', 'mfapi.latest', '--offline', '--format', 'text', '--', '--scheme-code', '125497'], env)
    assert.match(text.stdout, /Indian Mutual Fund Latest NAV/)
    assert.match(text.stdout, /open REST API only · no auth/)
  })
})

async function runJson<T extends Record<string, unknown>>(args: string[], env: NodeJS.ProcessEnv = process.env): Promise<T> {
  const result = await runCli(args, env)
  return JSON.parse(result.stdout) as T
}

async function runCli(args: string[], env: NodeJS.ProcessEnv = process.env): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync('npx', ['tsx', 'src/cli.ts', ...args], { cwd: process.cwd(), env, maxBuffer: 1024 * 1024 })
  return { stdout: stripAnsi(result.stdout), stderr: stripAnsi(result.stderr) }
}

async function withPublicApisHome(run: (publicApisHome: string) => Promise<void>): Promise<void> {
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
