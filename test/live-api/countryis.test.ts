import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const live = process.env.PUBLIC_APIS_LIVE_E2E === '1'

test('Country.is live lookup and info verify JSON, text output, and offline replay', { skip: live ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome, NO_COLOR: '1' }
    const lookup = await runJson<CountryIsLookupLive>(['apis', 'run', 'countryis.lookup', '--online', '--persist', '--format', 'json', '--', '--ip', '8.8.8.8', '--include-details', 'true'], env)
    assert.equal(lookup.kind, 'countryis.lookup')
    assert.equal(lookup.api.authentication, 'none')
    assert.equal(lookup.api.usesBrowserClickstream, false)
    assert.equal(lookup.lookup.ip, '8.8.8.8')
    assert.equal(lookup.lookup.country, 'US')
    assert.equal(lookup.storage.persisted, true)

    const offline = await runJson<CountryIsLookupLive>(['apis', 'run', 'countryis.lookup', '--offline', '--format', 'json', '--', '--ip', '8.8.8.8', '--include-details', 'true'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.lookup, lookup.lookup)

    const text = await runCli(['apis', 'run', 'countryis.lookup', '--offline', '--format', 'text', '--', '--ip', '8.8.8.8', '--include-details', 'true'], env)
    assert.match(text.stdout, /Country\.is Lookup/)
    assert.match(text.stdout, /open REST API only · no auth/)
    assert.match(text.stdout, /IP geolocation/)

    const info = await runJson<CountryIsInfoLive>(['apis', 'run', 'countryis.info', '--online', '--persist', '--format', 'json'], env)
    assert.equal(info.kind, 'countryis.info')
    assert.equal(info.api.authentication, 'none')
    assert.equal(info.api.usesBrowserClickstream, false)
    assert.ok(info.info.version.length > 0)
  })
})

type CountryIsLookupLive = {
  kind: 'countryis.lookup'
  api: { authentication: 'none'; usesBrowserClickstream: false }
  lookup: { ip: string; country: string }
  storage: { mode: 'online' | 'offline'; persisted: boolean }
}

type CountryIsInfoLive = {
  kind: 'countryis.info'
  api: { authentication: 'none'; usesBrowserClickstream: false }
  info: { version: string }
  storage: { mode: 'online' | 'offline'; persisted: boolean }
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
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-countryis-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
