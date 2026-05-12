import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const liveEnabled = process.env.PUBLIC_APIS_LIVE_E2E === '1'

type AgifyResult = Record<string, unknown> & {
  kind: string
  api: { provider: string; authentication: string; usesBrowserClickstream: boolean }
  query: { name: string; countryId?: string | undefined }
  prediction: { name: string; age: number | null; count: number; countryId?: string | undefined }
  storage: { mode?: string | undefined; persisted?: boolean | undefined }
}

test('Agify live e2e covers json, text, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const json = await runJson<AgifyResult>(['apis', 'run', 'agify.age', '--format', 'json', '--', '--name', 'michael', '--country-id', 'US'])
  assert.equal(json.kind, 'agify.age')
  assert.equal(json.api.provider, 'agify')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.query.name, 'michael')
  assert.equal(json.query.countryId, 'US')
  assert.equal(json.prediction.name, 'michael')
  assert.equal(json.prediction.countryId, 'US')
  assert.ok(json.prediction.count > 0)

  const text = await runCli(['apis', 'run', 'agify.age', '--format', 'text', '--', '--name', 'michael', '--country-id', 'US'])
  assert.match(text.stdout, /Agify Age Prediction/)
  assert.match(text.stdout, /open REST API only · no auth/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<AgifyResult>(['apis', 'run', 'agify.age', '--online', '--persist', '--format', 'json', '--', '--name', 'michael', '--country-id', 'US'], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<AgifyResult>(['apis', 'run', 'agify.age', '--offline', '--format', 'json', '--', '--name', 'michael', '--country-id', 'US'], env)
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
