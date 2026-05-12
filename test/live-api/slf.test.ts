import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const live = process.env.PUBLIC_APIS_LIVE_E2E === '1'

test('SLF live lookup verifies JSON, text output, and offline replay', { skip: live ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome, NO_COLOR: '1' }
    const online = await runJson<SlfLiveResult>(['apis', 'run', 'slf.lookup', '--online', '--persist', '--format', 'json', '--', '--letter', 'a', '--category', 'stadt', '--limit', '5'], env)
    assert.equal(online.kind, 'slf.lookup')
    assert.equal(online.api.authentication, 'none')
    assert.equal(online.api.usesBrowserClickstream, false)
    assert.equal(online.api.transport, 'HTTPS static JSON')
    assert.ok(online.values.includes('Aachen') || online.values.includes('Aalen'))
    assert.equal(online.storage.persisted, true)

    const offline = await runJson<SlfLiveResult>(['apis', 'run', 'slf.lookup', '--offline', '--format', 'json', '--', '--letter', 'a', '--category', 'stadt', '--limit', '5'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.values, online.values)

    const text = await runCli(['apis', 'run', 'slf.lookup', '--offline', '--format', 'text', '--', '--letter', 'a', '--category', 'stadt', '--limit', '5'], env)
    assert.match(text.stdout, /SLF Lookup/)
    assert.match(text.stdout, /static JSON only · no auth/)
    assert.match(text.stdout, /Aachen|Aalen/u)
  })
})

type SlfLiveResult = {
  kind: 'slf.lookup'
  api: { authentication: 'none'; usesBrowserClickstream: false; transport: 'HTTPS static JSON' }
  values: string[]
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
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-slf-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
