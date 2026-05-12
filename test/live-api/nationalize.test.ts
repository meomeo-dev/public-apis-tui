import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const liveEnabled = process.env.PUBLIC_APIS_LIVE_E2E === '1'

type NationalizeResult = Record<string, unknown> & {
  kind: string
  api: { provider: string; authentication: string; usesBrowserClickstream: boolean }
  query: { name: string }
  prediction: { name: string; count: number; countries: Array<{ countryId: string; probability: number }> }
  storage: { mode?: string | undefined; persisted?: boolean | undefined }
}

test('Nationalize live e2e covers json, text, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const json = await runJson<NationalizeResult>(['apis', 'run', 'nationalize.predict', '--format', 'json', '--', '--name', 'kim'])
  assert.equal(json.kind, 'nationalize.predict')
  assert.equal(json.api.provider, 'nationalize')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.query.name, 'kim')
  assert.equal(json.prediction.name, 'kim')
  assert.ok(json.prediction.count > 0)
  assert.ok(json.prediction.countries.length > 0)
  assert.ok(json.prediction.countries[0]?.probability !== undefined)

  const text = await runCli(['apis', 'run', 'nationalize.predict', '--format', 'text', '--', '--name', 'kim'])
  assert.match(text.stdout, /Nationalize\.io Prediction/)
  assert.match(text.stdout, /open REST API only · no auth/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<NationalizeResult>(['apis', 'run', 'nationalize.predict', '--online', '--persist', '--format', 'json', '--', '--name', 'kim'], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<NationalizeResult>(['apis', 'run', 'nationalize.predict', '--offline', '--format', 'json', '--', '--name', 'kim'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.prediction, online.prediction)
  })
})

async function runJson<T extends Record<string, unknown>>(args: string[], env: NodeJS.ProcessEnv = process.env): Promise<T> {
  const result = await runCli(args, env)
  return JSON.parse(result.stdout) as T
}

async function runCli(args: string[], env: NodeJS.ProcessEnv = process.env): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync('npx', ['tsx', 'src/cli.ts', ...args], {
    cwd: process.cwd(),
    env,
    maxBuffer: 4 * 1024 * 1024,
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
