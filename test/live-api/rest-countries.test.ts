import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const live = process.env.PUBLIC_APIS_LIVE_E2E === '1'

test('REST Countries live operations verify JSON, text output, and offline replay', { skip: live ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome, NO_COLOR: '1' }
    const alpha = await runJson<RestCountriesAlphaLive>(['apis', 'run', 'restcountries.alpha', '--online', '--persist', '--format', 'json', '--', '--code', 'DE'], env)
    assert.equal(alpha.kind, 'restcountries.alpha')
    assert.equal(alpha.api.authentication, 'none')
    assert.equal(alpha.api.usesBrowserClickstream, false)
    assert.equal(alpha.country?.cca3, 'DEU')
    assert.equal(alpha.storage.persisted, true)

    const name = await runJson<RestCountriesCollectionLive>(['apis', 'run', 'restcountries.name', '--online', '--format', 'json', '--', '--name', 'peru', '--limit', '2'], env)
    assert.equal(name.kind, 'restcountries.name')
    assert.ok(name.countries.some(country => country.cca2 === 'PE'))

    const region = await runJson<RestCountriesCollectionLive>(['apis', 'run', 'restcountries.region', '--online', '--format', 'json', '--', '--region', 'europe', '--limit', '2'], env)
    assert.equal(region.kind, 'restcountries.region')
    assert.ok(region.countries.length > 0)

    const offline = await runJson<RestCountriesAlphaLive>(['apis', 'run', 'restcountries.alpha', '--offline', '--format', 'json', '--', '--code', 'DE'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.country, alpha.country)

    const text = await runCli(['apis', 'run', 'restcountries.alpha', '--offline', '--format', 'text', '--', '--code', 'DE'], env)
    assert.match(text.stdout, /REST Countries Alpha/u)
    assert.match(text.stdout, /open REST API only · no auth/u)
    assert.match(text.stdout, /Germany/u)
  })
})

type RestCountriesAlphaLive = {
  kind: 'restcountries.alpha'
  api: { authentication: 'none'; usesBrowserClickstream: false }
  country?: { cca3: string }
  storage: { mode: 'online' | 'offline'; persisted: boolean }
}

type RestCountriesCollectionLive = {
  kind: 'restcountries.name' | 'restcountries.region'
  countries: Array<{ cca2: string }>
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
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-rest-countries-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
