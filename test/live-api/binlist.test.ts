import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const live = process.env.PUBLIC_APIS_LIVE_E2E === '1'

test('Binlist live lookup verifies JSON and offline text replay with one online request', { skip: live ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const tempHome = await mkdtemp(join(tmpdir(), 'public-apis-tui-binlist-'))
  try {
    const env = { PUBLIC_APIS_TUI_HOME: tempHome }
    const online = await runJson<BinlistLiveResult>(['apis', 'run', 'binlist.lookup', '--online', '--persist', '--format', 'json', '--', '--bin', '45717360'], env)
    assert.equal(online.kind, 'binlist.lookup')
    assert.equal(online.api.authentication, 'none')
    assert.equal(online.api.usesBrowserClickstream, false)
    assert.equal(online.storage?.persisted, true)
    assert.equal(online.query.bin, '45717360')
    assert.equal(typeof online.card.scheme, 'string')
    assert.equal(typeof online.country?.name, 'string')

    const offline = await runJson<BinlistLiveResult>(['apis', 'run', 'binlist.lookup', '--offline', '--format', 'json', '--', '--bin', '45717360'], env)
    assert.equal(offline.storage?.mode, 'offline')
    assert.deepEqual(offline.card, online.card)

    const text = await runCli(['apis', 'run', 'binlist.lookup', '--offline', '--format', 'text', '--', '--bin', '45717360'], env)
    assert.match(text, /Binlist BIN\/IIN Lookup/)
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

type BinlistLiveResult = {
  kind: 'binlist.lookup'
  api: { authentication: string; usesBrowserClickstream: boolean }
  query: { bin: string }
  card: Record<string, unknown>
  country?: { name?: string }
  storage?: { mode: string; persisted?: boolean }
}
