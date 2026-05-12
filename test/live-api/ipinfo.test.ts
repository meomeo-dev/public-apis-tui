import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const live = process.env.PUBLIC_APIS_LIVE_E2E === '1'

test('IPinfo live explicit lookup verifies JSON, text output, and offline replay', { skip: live ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome, NO_COLOR: '1' }
    const lookup = await runJson<IpInfoLiveResult>(['apis', 'run', 'ipinfo.lookup', '--online', '--persist', '--format', 'json', '--', '--ip', '8.8.8.8'], env)
    assert.equal(lookup.kind, 'ipinfo.lookup')
    assert.equal(lookup.api.authentication, 'none')
    assert.equal(lookup.api.usesBrowserClickstream, false)
    assert.equal(lookup.query.ip, '8.8.8.8')
    assert.equal(lookup.lookup.ip, '8.8.8.8')
    assert.equal(lookup.lookup.country, 'US')
    assert.match(String(lookup.lookup.missingAuthReadme ?? ''), /missingauth/u)
    assert.equal(lookup.storage.persisted, true)

    const offline = await runJson<IpInfoLiveResult>(['apis', 'run', 'ipinfo.lookup', '--offline', '--format', 'json', '--', '--ip', '8.8.8.8'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.lookup, lookup.lookup)

    const text = await runCli(['apis', 'run', 'ipinfo.lookup', '--offline', '--format', 'text', '--', '--ip', '8.8.8.8'], env)
    assert.match(text.stdout, /IPinfo Lookup/)
    assert.match(text.stdout, /open REST API only · no auth/)
    assert.match(text.stdout, /missingauth/)
  })
})

type IpInfoLiveResult = {
  kind: 'ipinfo.lookup'
  api: { authentication: 'none'; usesBrowserClickstream: false }
  query: { ip: string }
  lookup: { ip: string; country?: string | undefined; missingAuthReadme?: string | undefined }
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
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-ipinfo-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
