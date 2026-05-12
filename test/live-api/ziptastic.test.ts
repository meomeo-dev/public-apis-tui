import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const live = process.env.PUBLIC_APIS_LIVE_E2E === '1'

test('Ziptastic live lookup verifies JSON body, text output, and offline replay', { skip: live ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome, NO_COLOR: '1' }
    const online = await runJson<ZiptasticLiveResult>(['apis', 'run', 'ziptastic.lookup', '--online', '--persist', '--format', 'json', '--', '--zip', '90210'], env)
    assert.equal(online.kind, 'ziptastic.lookup')
    assert.equal(online.api.authentication, 'none')
    assert.equal(online.api.usesBrowserClickstream, false)
    assert.match(online.api.transport, /text\/html/u)
    assert.equal(online.address?.city, 'BEVERLY HILLS')
    assert.equal(online.storage.persisted, true)

    const offline = await runJson<ZiptasticLiveResult>(['apis', 'run', 'ziptastic.lookup', '--offline', '--format', 'json', '--', '--zip', '90210'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.address, online.address)

    const text = await runCli(['apis', 'run', 'ziptastic.lookup', '--offline', '--format', 'text', '--', '--zip', '90210'], env)
    assert.match(text.stdout, /Ziptastic Lookup/)
    assert.match(text.stdout, /JSON body only · no auth/)
    assert.match(text.stdout, /BEVERLY HILLS/)
  })
})

type ZiptasticLiveResult = {
  kind: 'ziptastic.lookup'
  api: { authentication: 'none'; usesBrowserClickstream: false; transport: string }
  address?: { city?: string | undefined }
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
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-ziptastic-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
