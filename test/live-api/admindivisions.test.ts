import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const live = process.env.PUBLIC_APIS_LIVE_E2E === '1'

test('Administrative Divisions live country verifies JSON, text output, and offline replay', { skip: live ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const args = ['apis', 'run', 'admindivisions.country', '--format', 'json', '--', '--country', 'KE', '--limit', '5']
  const json = await runJson<AdminDivisionsLiveResult>(args)
  assert.equal(json.kind, 'admindivisions.country')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.country.code, 'KE')
  assert.equal(json.pagination.returned, 5)
  assert.equal(json.divisions[0], 'West Pokot')

  const text = await runCli(['apis', 'run', 'admindivisions.country', '--format', 'text', '--', '--country', 'US', '--limit', '5'])
  assert.match(text.stdout, /Administrative Divisions/)
  assert.match(text.stdout, /open REST API only · no auth/)
  assert.match(text.stdout, /Washington, D.C./)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<AdminDivisionsLiveResult>(['apis', 'run', 'admindivisions.country', '--online', '--persist', '--format', 'json', '--', '--country', 'KE', '--limit', '5'], env)
    const offline = await runJson<AdminDivisionsLiveResult>(['apis', 'run', 'admindivisions.country', '--offline', '--format', 'json', '--', '--country', 'KE', '--limit', '5'], env)
    assert.equal(online.storage.persisted, true)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.divisions, online.divisions)
  })
})

type AdminDivisionsLiveResult = {
  kind: 'admindivisions.country'
  api: {
    authentication: 'none'
    usesBrowserClickstream: false
  }
  country: { code: string }
  pagination: { returned: number }
  divisions: string[]
  storage: {
    mode: 'online' | 'offline'
    persisted: boolean
  }
}

async function runJson<T extends Record<string, unknown>>(args: string[], env: NodeJS.ProcessEnv = process.env): Promise<T> {
  const result = await runCli(args, env)
  return JSON.parse(result.stdout) as T
}

async function runCli(args: string[], env: NodeJS.ProcessEnv = process.env): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync('npx', ['tsx', 'src/cli.ts', ...args], {
    cwd: process.cwd(),
    env,
    maxBuffer: 8 * 1024 * 1024,
  })
  return { stdout: stripAnsi(result.stdout), stderr: stripAnsi(result.stderr) }
}

async function withPublicApisHome(run: (publicApisHome: string) => Promise<void>): Promise<void> {
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
