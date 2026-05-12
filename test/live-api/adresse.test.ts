import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const live = process.env.PUBLIC_APIS_LIVE_E2E === '1'

test('adresse live search and reverse verify JSON, text output, and offline replay', { skip: live ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome, NO_COLOR: '1' }
    const search = await runJson<AdresseLiveResult>(['apis', 'run', 'adresse.search', '--online', '--persist', '--format', 'json', '--', '--query', '8 bd du port', '--limit', '2'], env)
    assert.equal(search.kind, 'adresse.search')
    assert.equal(search.api.authentication, 'none')
    assert.equal(search.api.usesBrowserClickstream, false)
    assert.ok(search.results.length > 0)
    assert.equal(search.storage.persisted, true)

    const searchOffline = await runJson<AdresseLiveResult>(['apis', 'run', 'adresse.search', '--offline', '--format', 'json', '--', '--query', '8 bd du port', '--limit', '2'], env)
    assert.equal(searchOffline.storage.mode, 'offline')
    assert.deepEqual(searchOffline.results, search.results)

    const searchText = await runCli(['apis', 'run', 'adresse.search', '--offline', '--format', 'text', '--', '--query', '8 bd du port', '--limit', '2'], env)
    assert.match(searchText.stdout, /adresse\.data\.gouv\.fr Search/)
    assert.match(searchText.stdout, /open REST API only · no auth/)
    assert.match(searchText.stdout, /no Chrome clickstream/)
    assert.match(searchText.stdout, /migration/)

    const reverse = await runJson<AdresseLiveResult>(['apis', 'run', 'adresse.reverse', '--online', '--persist', '--format', 'json', '--', '--latitude', '48.357', '--longitude', '2.37', '--limit', '2'], env)
    assert.equal(reverse.kind, 'adresse.reverse')
    assert.equal(reverse.api.authentication, 'none')
    assert.equal(reverse.api.usesBrowserClickstream, false)
    assert.ok(reverse.results.length > 0)
    assert.equal(reverse.storage.persisted, true)

    const reverseOffline = await runJson<AdresseLiveResult>(['apis', 'run', 'adresse.reverse', '--offline', '--format', 'json', '--', '--latitude', '48.357', '--longitude', '2.37', '--limit', '2'], env)
    assert.equal(reverseOffline.storage.mode, 'offline')
    assert.deepEqual(reverseOffline.results, reverse.results)

    const reverseText = await runCli(['apis', 'run', 'adresse.reverse', '--offline', '--format', 'text', '--', '--latitude', '48.357', '--longitude', '2.37', '--limit', '2'], env)
    assert.match(reverseText.stdout, /adresse\.data\.gouv\.fr Reverse/)
    assert.match(reverseText.stdout, /open REST API only · no auth/)
  })
})

type AdresseLiveResult = {
  kind: 'adresse.search' | 'adresse.reverse'
  api: {
    authentication: 'none'
    usesBrowserClickstream: false
  }
  results: Array<Record<string, unknown>>
  storage: {
    mode: 'online' | 'offline'
    persisted: boolean
  }
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
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-adresse-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
