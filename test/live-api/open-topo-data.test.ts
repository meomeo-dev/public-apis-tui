import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const live = process.env.PUBLIC_APIS_LIVE_E2E === '1'

test('Open Topo Data live lookup verifies JSON, text output, and offline replay', { skip: live ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome, NO_COLOR: '1' }
    const online = await runJson<OpenTopoDataLiveResult>(['apis', 'run', 'opentopodata.lookup', '--online', '--persist', '--format', 'json', '--', '--locations', '39.7471,-104.9963', '--dataset', 'srtm90m', '--interpolation', 'bilinear'], env)
    assert.equal(online.kind, 'opentopodata.lookup')
    assert.equal(online.api.authentication, 'none')
    assert.equal(online.api.usesBrowserClickstream, false)
    assert.equal(online.query.dataset, 'srtm90m')
    assert.equal(online.storage.persisted, true)
    assert.ok(online.elevations.length >= 1)
    assert.equal(typeof online.elevations[0]?.elevation, 'number')

    const offline = await runJson<OpenTopoDataLiveResult>(['apis', 'run', 'opentopodata.lookup', '--offline', '--format', 'json', '--', '--locations', '39.7471,-104.9963', '--dataset', 'srtm90m', '--interpolation', 'bilinear'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.elevations, online.elevations)

    const text = await runCli(['apis', 'run', 'opentopodata.lookup', '--offline', '--format', 'text', '--', '--locations', '39.7471,-104.9963', '--dataset', 'srtm90m', '--interpolation', 'bilinear'], env)
    assert.match(text.stdout, /Open Topo Data Lookup/)
    assert.match(text.stdout, /open REST API only · no auth/)
    assert.match(text.stdout, /srtm90m/)
  })
})

type OpenTopoDataLiveResult = {
  kind: 'opentopodata.lookup'
  api: { authentication: 'none'; usesBrowserClickstream: false }
  query: { dataset: string }
  elevations: Array<{ elevation: number | null }>
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
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-opentopodata-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
