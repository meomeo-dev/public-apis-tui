import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const live = process.env.PUBLIC_APIS_LIVE_E2E === '1'

test('IPGEO live explicit lookup verifies JSON, text output, and offline replay', { skip: live ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome, NO_COLOR: '1' }
    const lookup = await runJson<IpGeoLiveResult>(['apis', 'run', 'ipgeo.lookup', '--online', '--persist', '--format', 'json', '--', '--query', '8.8.8.8'], env)
    assert.equal(lookup.kind, 'ipgeo.lookup')
    assert.equal(lookup.api.authentication, 'none')
    assert.equal(lookup.api.usesBrowserClickstream, false)
    assert.equal(lookup.api.transport, 'HTTPS JSON REST')
    assert.equal(lookup.query.query, '8.8.8.8')
    assert.equal(lookup.lookup.status, 'success')
    assert.equal(lookup.lookup.ip, '8.8.8.8')
    assert.equal(lookup.lookup.countryCode, 'US')
    assert.equal(lookup.storage.persisted, true)

    const offline = await runJson<IpGeoLiveResult>(['apis', 'run', 'ipgeo.lookup', '--offline', '--format', 'json', '--', '--query', '8.8.8.8'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.lookup, lookup.lookup)

    const text = await runCli(['apis', 'run', 'ipgeo.lookup', '--offline', '--format', 'text', '--', '--query', '8.8.8.8'], env)
    assert.match(text.stdout, /IPGEO Lookup/)
    assert.match(text.stdout, /open REST API only · no auth/)
    assert.match(text.stdout, /never defaults to current-client IP/)
  })
})

type IpGeoLiveResult = {
  kind: 'ipgeo.lookup'
  api: { authentication: 'none'; usesBrowserClickstream: false; transport: 'HTTPS JSON REST' }
  query: { query: string }
  lookup: { status: 'success'; ip: string; countryCode?: string | undefined }
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
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-ipgeo-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
