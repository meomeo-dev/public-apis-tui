import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const live = process.env.PUBLIC_APIS_LIVE_E2E === '1'

test('Nominatim live search and reverse verify JSON, text output, and offline replay', { skip: live ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome, NO_COLOR: '1' }
    const search = await runJson<NominatimSearchLiveResult>(['apis', 'run', 'nominatim.search', '--online', '--persist', '--format', 'json', '--', '--query', 'Berlin', '--limit', '2', '--language', 'en'], env)
    assert.equal(search.kind, 'nominatim.search')
    assert.equal(search.api.authentication, 'none')
    assert.equal(search.api.usesBrowserClickstream, false)
    assert.match(search.api.usagePolicy, /1 request per second/u)
    assert.equal(search.query.query, 'Berlin')
    assert.ok(search.places.length >= 1)
    assert.equal(search.storage.persisted, true)

    const searchOffline = await runJson<NominatimSearchLiveResult>(['apis', 'run', 'nominatim.search', '--offline', '--format', 'json', '--', '--query', 'Berlin', '--limit', '2', '--language', 'en'], env)
    assert.equal(searchOffline.storage.mode, 'offline')
    assert.deepEqual(searchOffline.places, search.places)

    const searchText = await runCli(['apis', 'run', 'nominatim.search', '--offline', '--format', 'text', '--', '--query', 'Berlin', '--limit', '2', '--language', 'en'], env)
    assert.match(searchText.stdout, /Nominatim Search/)
    assert.match(searchText.stdout, /OpenStreetMap contributors/)

    await sleep(1200)
    const reverse = await runJson<NominatimReverseLiveResult>(['apis', 'run', 'nominatim.reverse', '--online', '--persist', '--format', 'json', '--', '--latitude', '52.5170365', '--longitude', '13.3888599', '--language', 'en'], env)
    assert.equal(reverse.kind, 'nominatim.reverse')
    assert.equal(reverse.api.authentication, 'none')
    assert.equal(reverse.api.usesBrowserClickstream, false)
    assert.equal(reverse.storage.persisted, true)
    assert.match(reverse.place.displayName, /Berlin|Unter den Linden/u)

    const reverseOffline = await runJson<NominatimReverseLiveResult>(['apis', 'run', 'nominatim.reverse', '--offline', '--format', 'json', '--', '--latitude', '52.5170365', '--longitude', '13.3888599', '--language', 'en'], env)
    assert.equal(reverseOffline.storage.mode, 'offline')
    assert.deepEqual(reverseOffline.place, reverse.place)
  })
})

type NominatimSearchLiveResult = {
  kind: 'nominatim.search'
  api: { authentication: 'none'; usesBrowserClickstream: false; usagePolicy: string }
  query: { query: string }
  places: Array<{ displayName: string }>
  storage: { mode: 'online' | 'offline'; persisted: boolean }
}

type NominatimReverseLiveResult = {
  kind: 'nominatim.reverse'
  api: { authentication: 'none'; usesBrowserClickstream: false }
  place: { displayName: string }
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
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-nominatim-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

async function sleep(ms: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms))
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
