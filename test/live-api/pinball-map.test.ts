import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const live = process.env.PUBLIC_APIS_LIVE_E2E === '1'

test('Pinball Map live regions and locations verify JSON, text output, and offline replay', { skip: live ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome, NO_COLOR: '1' }
    const regions = await runJson<PinballRegionsLiveResult>(['apis', 'run', 'pinballmap.regions', '--online', '--persist', '--format', 'json', '--', '--query', 'oregon', '--limit', '5'], env)
    assert.equal(regions.kind, 'pinballmap.regions')
    assert.equal(regions.api.authentication, 'none')
    assert.equal(regions.api.usesBrowserClickstream, false)
    assert.ok(regions.regions.some(region => region.name === 'portland'))
    assert.equal(regions.storage.persisted, true)

    const regionsOffline = await runJson<PinballRegionsLiveResult>(['apis', 'run', 'pinballmap.regions', '--offline', '--format', 'json', '--', '--query', 'oregon', '--limit', '5'], env)
    assert.equal(regionsOffline.storage.mode, 'offline')
    assert.deepEqual(regionsOffline.regions, regions.regions)

    const locations = await runJson<PinballLocationsLiveResult>(['apis', 'run', 'pinballmap.locations', '--online', '--persist', '--format', 'json', '--', '--region', 'portland', '--query', 'ground', '--limit', '5'], env)
    assert.equal(locations.kind, 'pinballmap.locations')
    assert.equal(locations.api.authentication, 'none')
    assert.equal(locations.api.usesBrowserClickstream, false)
    assert.equal(locations.query.region, 'portland')
    assert.ok(locations.locations.length >= 1)

    const text = await runCli(['apis', 'run', 'pinballmap.locations', '--offline', '--format', 'text', '--', '--region', 'portland', '--query', 'ground', '--limit', '5'], env)
    assert.match(text.stdout, /Pinball Map Locations/)
    assert.match(text.stdout, /open REST API only · no auth/)
    assert.match(text.stdout, /Ground/u)
  })
})

type PinballRegionsLiveResult = {
  kind: 'pinballmap.regions'
  api: { authentication: 'none'; usesBrowserClickstream: false }
  regions: Array<{ name: string }>
  storage: { mode: 'online' | 'offline'; persisted: boolean }
}

type PinballLocationsLiveResult = {
  kind: 'pinballmap.locations'
  api: { authentication: 'none'; usesBrowserClickstream: false }
  query: { region: string }
  locations: Array<{ name: string }>
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
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-pinballmap-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
