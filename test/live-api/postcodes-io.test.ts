import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const live = process.env.PUBLIC_APIS_LIVE_E2E === '1'

test('Postcodes.io live operations verify JSON, text output, and offline replay', { skip: live ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome, NO_COLOR: '1' }
    const lookup = await runJson<PostcodesIoLookupLive>(['apis', 'run', 'postcodes-io.lookup', '--online', '--persist', '--format', 'json', '--', '--postcode', 'SW1A 2AA'], env)
    assert.equal(lookup.kind, 'postcodes-io.lookup')
    assert.equal(lookup.api.authentication, 'none')
    assert.equal(lookup.api.usesBrowserClickstream, false)
    assert.equal(lookup.postcode?.postcode, 'SW1A 2AA')
    assert.equal(lookup.storage.persisted, true)

    const search = await runJson<PostcodesIoCollectionLive>(['apis', 'run', 'postcodes-io.search', '--online', '--format', 'json', '--', '--query', 'SW1A', '--limit', '2'], env)
    assert.equal(search.kind, 'postcodes-io.search')
    assert.ok(search.postcodes.some(postcode => postcode.postcode.startsWith('SW1A')))

    const nearest = await runJson<PostcodesIoCollectionLive>(['apis', 'run', 'postcodes-io.nearest', '--online', '--format', 'json', '--', '--latitude', '51.5074', '--longitude', '-0.1278', '--limit', '2'], env)
    assert.equal(nearest.kind, 'postcodes-io.nearest')
    assert.equal(nearest.api.authentication, 'none')
    assert.ok(nearest.postcodes.length > 0)

    const offline = await runJson<PostcodesIoLookupLive>(['apis', 'run', 'postcodes-io.lookup', '--offline', '--format', 'json', '--', '--postcode', 'SW1A 2AA'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.postcode, lookup.postcode)

    const text = await runCli(['apis', 'run', 'postcodes-io.lookup', '--offline', '--format', 'text', '--', '--postcode', 'SW1A 2AA'], env)
    assert.match(text.stdout, /Postcodes\.io Lookup/u)
    assert.match(text.stdout, /open REST API only · no auth/u)
    assert.match(text.stdout, /SW1A 2AA/u)
  })
})

type PostcodesIoLookupLive = {
  kind: 'postcodes-io.lookup'
  api: { authentication: 'none'; usesBrowserClickstream: false }
  postcode?: { postcode: string }
  storage: { mode: 'online' | 'offline'; persisted: boolean }
}

type PostcodesIoCollectionLive = {
  kind: 'postcodes-io.search' | 'postcodes-io.nearest'
  api: { authentication: 'none'; usesBrowserClickstream: false }
  postcodes: Array<{ postcode: string }>
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
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-postcodes-io-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
