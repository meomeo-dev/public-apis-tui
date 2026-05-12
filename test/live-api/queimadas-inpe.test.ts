import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const live = process.env.PUBLIC_APIS_LIVE_E2E === '1'

test('Queimadas INPE live latest 10-minute CSV verifies JSON, text output, and offline replay', { skip: live ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome, NO_COLOR: '1' }
    const online = await runJson<QueimadasInpeLiveResult>(['apis', 'run', 'queimadas-inpe.latest10min', '--online', '--persist', '--format', 'json', '--', '--limit', '3'], env)
    assert.equal(online.kind, 'queimadas-inpe.latest10min')
    assert.equal(online.api.authentication, 'none')
    assert.equal(online.api.usesBrowserClickstream, false)
    assert.match(online.api.publicSafety, /not emergency dispatch/u)
    assert.match(online.file.name, /^focos_10min_[0-9]{8}_[0-9]{4}\.csv$/u)
    assert.ok(online.count.totalRows >= online.focuses.length)
    assert.equal(online.storage.persisted, true)

    const offline = await runJson<QueimadasInpeLiveResult>(['apis', 'run', 'queimadas-inpe.latest10min', '--offline', '--format', 'json', '--', '--limit', '3'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.file, online.file)
    assert.deepEqual(offline.focuses, online.focuses)

    const text = await runCli(['apis', 'run', 'queimadas-inpe.latest10min', '--offline', '--format', 'text', '--', '--limit', '3'], env)
    assert.match(text.stdout, /Queimadas INPE Latest 10min/u)
    assert.match(text.stdout, /open data CSV only · no auth/u)
    assert.match(text.stdout, /not emergency dispatch/u)
  })
})

type QueimadasInpeLiveResult = {
  kind: 'queimadas-inpe.latest10min'
  api: { authentication: 'none'; usesBrowserClickstream: false; publicSafety: string }
  file: { name: string; url: string }
  focuses: Array<{ latitude: number; longitude: number; satellite: string; observedAt: string }>
  count: { returned: number; totalRows: number }
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
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-queimadas-inpe-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
