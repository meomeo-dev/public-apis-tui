import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const liveEnabled = process.env.PUBLIC_APIS_LIVE_E2E === '1'

type WhiskyHunterLiveResult = Record<string, unknown> & {
  kind: 'whiskyhunter.distilleries'
  api: { provider: string; authentication: string; usesBrowserClickstream: boolean }
  query: { limit: number; country?: string | undefined }
  pagination: { returned: number; upstreamTotal: number; limit: number }
  distilleries: Array<Record<string, unknown>>
  storage: { mode?: string | undefined; persisted?: boolean | undefined }
}

test('WhiskyHunter live distilleries verifies JSON and offline text replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<WhiskyHunterLiveResult>(['apis', 'run', 'whiskyhunter.distilleries', '--online', '--persist', '--format', 'json', '--', '--country', 'Scotland', '--limit', '5'], env)
    assert.equal(online.kind, 'whiskyhunter.distilleries')
    assert.equal(online.api.provider, 'whiskyhunter')
    assert.equal(online.api.authentication, 'none')
    assert.equal(online.api.usesBrowserClickstream, false)
    assert.equal(online.query.country, 'Scotland')
    assert.equal(online.query.limit, 5)
    assert.ok(online.pagination.upstreamTotal >= 5)
    assert.ok(online.distilleries.length > 0)
    assert.equal(online.storage.persisted, true)

    const offline = await runJson<WhiskyHunterLiveResult>(['apis', 'run', 'whiskyhunter.distilleries', '--offline', '--format', 'json', '--', '--country', 'Scotland', '--limit', '5'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.distilleries, online.distilleries)

    const text = await runCli(['apis', 'run', 'whiskyhunter.distilleries', '--offline', '--format', 'text', '--', '--country', 'Scotland', '--limit', '5'], env)
    assert.match(text.stdout, /WhiskyHunter Distilleries/)
    assert.match(text.stdout, /open REST API only · no auth/)
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
    maxBuffer: 1024 * 1024,
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
