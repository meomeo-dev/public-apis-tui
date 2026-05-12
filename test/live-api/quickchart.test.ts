import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const live = process.env.PUBLIC_APIS_LIVE_E2E === '1'

test('QuickChart live render verifies JSON, text output, and offline replay', { skip: live ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const args = ['apis', 'run', 'quickchart.render', '--format', 'json', '--', '--type', 'bar', '--labels', 'A,B', '--data', '1,2', '--title', 'Live', '--width', '500', '--height', '300']
  const json = await runJson<QuickChartLiveResult>(args)
  assert.equal(json.kind, 'quickchart.render')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.query.width, 500)
  assert.equal(json.chart.mediaType, 'image/png')
  assert.ok(json.chart.bytes > 1000)
  assert.equal(json.chart.dataUrl.startsWith('data:image/png;base64,'), true)

  const text = await runCli(['apis', 'run', 'quickchart.render', '--format', 'text', '--', '--type', 'bar', '--labels', 'A,B', '--data', '1,2', '--title', 'Live', '--width', '500', '--height', '300'])
  assert.match(text.stdout, /QuickChart Render/)
  assert.match(text.stdout, /open REST API only · no auth/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<QuickChartLiveResult>(['apis', 'run', 'quickchart.render', '--online', '--persist', '--format', 'json', '--', '--type', 'bar', '--labels', 'A,B', '--data', '1,2', '--title', 'Live', '--width', '500', '--height', '300'], env)
    const offline = await runJson<QuickChartLiveResult>(['apis', 'run', 'quickchart.render', '--offline', '--format', 'json', '--', '--type', 'bar', '--labels', 'A,B', '--data', '1,2', '--title', 'Live', '--width', '500', '--height', '300'], env)
    assert.equal(online.storage.persisted, true)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.chart, online.chart)
  })
})

type QuickChartLiveResult = {
  kind: 'quickchart.render'
  api: {
    authentication: 'none'
    usesBrowserClickstream: false
  }
  query: {
    width: number
  }
  chart: {
    mediaType: string
    bytes: number
    dataUrl: string
  }
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
