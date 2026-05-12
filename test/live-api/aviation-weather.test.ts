import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const liveEnabled = process.env.PUBLIC_APIS_LIVE_E2E === '1'

type AviationWeatherResult = {
  kind: 'aviationweather.metar' | 'aviationweather.taf'
  api: { provider: string; authentication: string; usesBrowserClickstream: boolean }
  reports: Array<Record<string, unknown>>
  storage: { mode?: string | undefined; persisted?: boolean | undefined }
}

test('AviationWeather live e2e covers METAR/TAF text and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env: NodeJS.ProcessEnv = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome, NO_COLOR: '1' }
    await assertOperation('aviationweather.metar', ['--ids', 'KSFO', '--limit', '1'], env)
    await assertOperation('aviationweather.taf', ['--ids', 'KSFO', '--limit', '1'], env)
  })
})

async function assertOperation(operation: AviationWeatherResult['kind'], queryArgs: string[], env: NodeJS.ProcessEnv): Promise<void> {
  const online = await runJson<AviationWeatherResult>(['apis', 'run', operation, '--online', '--persist', '--format', 'json', '--', ...queryArgs], env)
  assert.equal(online.kind, operation)
  assert.equal(online.api.provider, 'aviationweather')
  assert.equal(online.api.authentication, 'none')
  assert.equal(online.api.usesBrowserClickstream, false)
  assert.equal(online.storage.persisted, true)
  assert.ok(Array.isArray(online.reports))

  const offline = await runJson<AviationWeatherResult>(['apis', 'run', operation, '--offline', '--format', 'json', '--', ...queryArgs], env)
  assert.equal(offline.storage.mode, 'offline')
  assert.deepEqual(offline.reports, online.reports)

  const text = await runCli(['apis', 'run', operation, '--offline', '--format', 'text', '--', ...queryArgs], env)
  assert.match(text.stdout, /AviationWeather/)
  assert.match(text.stdout, /open REST API only/)
  assert.match(text.stdout, /no auth/)
  assert.match(text.stdout, /no Chrome clickstream/)
}

async function runJson<T>(args: string[], env: NodeJS.ProcessEnv): Promise<T> {
  const result = await runCli(args, env)
  return JSON.parse(result.stdout) as T
}

async function runCli(args: string[], env: NodeJS.ProcessEnv): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync('npx', ['tsx', 'src/cli.ts', ...args], { cwd: process.cwd(), env, maxBuffer: 1024 * 1024 })
  return { stdout: stripAnsi(result.stdout), stderr: stripAnsi(result.stderr) }
}

async function withPublicApisHome(run: (publicApisHome: string) => Promise<void>): Promise<void> {
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-aviationweather-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
