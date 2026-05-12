import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const liveEnabled = process.env.PUBLIC_APIS_LIVE_E2E === '1'

type PublicApiMeta = { provider: string; authentication: string; usesBrowserClickstream: boolean }
type StorageMeta = { mode?: string | undefined; persisted?: boolean | undefined }

type ForecastResult = Record<string, unknown> & {
  kind: 'gruenstromindex.forecast'
  api: PublicApiMeta
  query: { zip: string; limit: number }
  forecast: Array<{ gsi?: number | undefined; timeStamp?: number | undefined }>
  storage: StorageMeta
}

test('GrünstromIndex live e2e covers JSON, text, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<ForecastResult>(['apis', 'run', 'gruenstromindex.forecast', '--online', '--persist', '--format', 'json', '--', '--zip', '69168', '--limit', '98'], env)
    assert.equal(online.kind, 'gruenstromindex.forecast')
    assert.equal(online.api.provider, 'gruenstromindex')
    assert.equal(online.api.authentication, 'none')
    assert.equal(online.api.usesBrowserClickstream, false)
    assert.equal(online.query.zip, '69168')
    assert.ok(online.forecast.length > 0)
    assert.equal(online.storage.persisted, true)

    const offline = await runJson<ForecastResult>(['apis', 'run', 'gruenstromindex.forecast', '--offline', '--format', 'json', '--', '--zip', '69168', '--limit', '98'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.forecast, online.forecast)

    const text = await runCli(['apis', 'run', 'gruenstromindex.forecast', '--offline', '--format', 'text', '--', '--zip', '69168', '--limit', '98'], env)
    assert.match(text.stdout, /GrünstromIndex Forecast/)
    assert.match(text.stdout, /open REST API only · no auth/)
  })
})

async function runJson<T extends Record<string, unknown>>(args: string[], env: NodeJS.ProcessEnv = process.env): Promise<T> {
  const result = await runCli(args, env)
  return JSON.parse(result.stdout) as T
}

async function runCli(args: string[], env: NodeJS.ProcessEnv = process.env): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync('npx', ['tsx', 'src/cli.ts', ...args], { cwd: process.cwd(), env, maxBuffer: 1024 * 1024 })
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
