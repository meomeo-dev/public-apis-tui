import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const live = process.env.PUBLIC_APIS_LIVE_E2E === '1'

test('ViaCep live lookup and search verify JSON, text output, and offline replay', { skip: live ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome, NO_COLOR: '1' }
    const lookup = await runJson<ViaCepLookupLiveResult>(['apis', 'run', 'viacep.lookup', '--online', '--persist', '--format', 'json', '--', '--cep', '01001000'], env)
    assert.equal(lookup.kind, 'viacep.lookup')
    assert.equal(lookup.api.authentication, 'none')
    assert.equal(lookup.api.usesBrowserClickstream, false)
    assert.equal(lookup.address?.city, 'São Paulo')
    assert.equal(lookup.storage.persisted, true)

    const offline = await runJson<ViaCepLookupLiveResult>(['apis', 'run', 'viacep.lookup', '--offline', '--format', 'json', '--', '--cep', '01001000'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.address, lookup.address)

    const search = await runJson<ViaCepSearchLiveResult>(['apis', 'run', 'viacep.search', '--online', '--format', 'json', '--', '--state', 'SP', '--city', 'São Paulo', '--street', 'Paulista', '--limit', '3'], env)
    assert.equal(search.kind, 'viacep.search')
    assert.ok(search.addresses.length > 0)
    assert.equal(search.api.usesBrowserClickstream, false)

    const text = await runCli(['apis', 'run', 'viacep.lookup', '--offline', '--format', 'text', '--', '--cep', '01001000'], env)
    assert.match(text.stdout, /ViaCep Lookup/)
    assert.match(text.stdout, /open REST API only · no auth/)
    assert.match(text.stdout, /São Paulo/u)
  })
})

type ViaCepLookupLiveResult = {
  kind: 'viacep.lookup'
  api: { authentication: 'none'; usesBrowserClickstream: false }
  address?: { city?: string | undefined }
  storage: { mode: 'online' | 'offline'; persisted: boolean }
}

type ViaCepSearchLiveResult = {
  kind: 'viacep.search'
  api: { usesBrowserClickstream: false }
  addresses: Array<{ cep: string }>
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
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-viacep-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
