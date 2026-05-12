import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const live = process.env.PUBLIC_APIS_LIVE_E2E === '1'

test('Zippopotam.us live lookup and search verify JSON, text output, and offline replay', { skip: live ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome, NO_COLOR: '1' }
    const lookup = await runJson<ZippopotamLookupLiveResult>(['apis', 'run', 'zippopotam-us.lookup', '--online', '--persist', '--format', 'json', '--', '--country', 'US', '--postal-code', '90210', '--limit', '5'], env)
    assert.equal(lookup.kind, 'zippopotam-us.lookup')
    assert.equal(lookup.api.authentication, 'none')
    assert.equal(lookup.api.usesBrowserClickstream, false)
    assert.equal(lookup.places[0]?.placeName, 'Beverly Hills')
    assert.equal(lookup.storage.persisted, true)

    const offline = await runJson<ZippopotamLookupLiveResult>(['apis', 'run', 'zippopotam-us.lookup', '--offline', '--format', 'json', '--', '--country', 'US', '--postal-code', '90210', '--limit', '5'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.places, lookup.places)

    const search = await runJson<ZippopotamSearchLiveResult>(['apis', 'run', 'zippopotam-us.search', '--online', '--format', 'json', '--', '--country', 'US', '--state', 'MA', '--city', 'Belmont', '--limit', '3'], env)
    assert.equal(search.kind, 'zippopotam-us.search')
    assert.ok(search.places.some(place => place.postalCode === '02178' || place.postalCode === '02478'))
    assert.equal(search.api.usesBrowserClickstream, false)

    const text = await runCli(['apis', 'run', 'zippopotam-us.lookup', '--offline', '--format', 'text', '--', '--country', 'US', '--postal-code', '90210', '--limit', '5'], env)
    assert.match(text.stdout, /Zippopotam\.us Lookup/)
    assert.match(text.stdout, /open REST API only · no auth/)
    assert.match(text.stdout, /Beverly Hills/)
  })
})

type ZippopotamLookupLiveResult = {
  kind: 'zippopotam-us.lookup'
  api: { authentication: 'none'; usesBrowserClickstream: false }
  places: Array<{ placeName: string }>
  storage: { mode: 'online' | 'offline'; persisted: boolean }
}

type ZippopotamSearchLiveResult = {
  kind: 'zippopotam-us.search'
  api: { usesBrowserClickstream: false }
  places: Array<{ postalCode?: string | undefined }>
}

async function runJson<T extends Record<string, unknown>>(args: string[], env: NodeJS.ProcessEnv): Promise<T> {
  const result = await runCli(args, env)
  return JSON.parse(result.stdout) as T
}

async function runCli(args: string[], env: NodeJS.ProcessEnv): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync('npx', ['tsx', 'src/cli.ts', ...args], { cwd: process.cwd(), env, maxBuffer: 4 * 1024 * 1024 })
  return { stdout: stripAnsi(result.stdout), stderr: stripAnsi(result.stderr) }
}

async function withPublicApisHome(run: (publicApisHome: string) => Promise<void>): Promise<void> {
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-zippopotam-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
