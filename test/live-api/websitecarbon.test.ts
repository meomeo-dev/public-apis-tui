import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const live = process.env.PUBLIC_APIS_LIVE_E2E === '1'

test('Website Carbon live data estimate verifies JSON and offline text replay', { skip: live ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const tempHome = await mkdtemp(join(tmpdir(), 'public-apis-tui-websitecarbon-'))
  try {
    const env = { PUBLIC_APIS_TUI_HOME: tempHome }
    const online = await runJson<WebsiteCarbonLiveResult>(['apis', 'run', 'websitecarbon.data', '--online', '--persist', '--format', 'json', '--', '--bytes', '1000000', '--green', 'true'], env)
    assert.equal(online.kind, 'websitecarbon.data')
    assert.equal(online.api.authentication, 'none')
    assert.equal(online.api.usesBrowserClickstream, false)
    assert.equal(online.storage?.persisted, true)
    assert.equal(online.query.bytes, 1_000_000)
    assert.equal(online.query.green, true)
    assert.equal(typeof online.result.gco2e, 'number')
    assert.equal(typeof online.result.rating, 'string')

    const offline = await runJson<WebsiteCarbonLiveResult>(['apis', 'run', 'websitecarbon.data', '--offline', '--format', 'json', '--', '--bytes', '1000000', '--green', 'true'], env)
    assert.equal(offline.storage?.mode, 'offline')
    assert.deepEqual(offline.result, online.result)

    const text = await runCli(['apis', 'run', 'websitecarbon.data', '--offline', '--format', 'text', '--', '--bytes', '1000000', '--green', 'true'], env)
    assert.match(text, /Website Carbon Data Estimate/)
    assert.match(text, /open REST API only · no auth/)
    assert.match(text, /no Chrome clickstream/)
  } finally {
    await rm(tempHome, { recursive: true, force: true })
  }
})

async function runJson<T>(args: string[], extraEnv: Record<string, string> = {}): Promise<T> {
  const output = await runCli(args, extraEnv)
  return JSON.parse(output) as T
}

async function runCli(args: string[], extraEnv: Record<string, string> = {}): Promise<string> {
  const { stdout } = await execFileAsync('node', ['--import', 'tsx', 'src/cli.ts', ...args], {
    cwd: process.cwd(),
    env: { ...process.env, ...extraEnv, NO_COLOR: '1' },
    maxBuffer: 1024 * 1024,
  })
  return stdout
}

type WebsiteCarbonLiveResult = {
  kind: 'websitecarbon.data'
  api: { authentication: string; usesBrowserClickstream: boolean }
  query: { bytes: number; green: boolean }
  result: { gco2e: number; rating: string }
  storage?: { mode: string; persisted?: boolean }
}
