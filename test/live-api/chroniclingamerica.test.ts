import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const liveEnabled = process.env.PUBLIC_APIS_LIVE_E2E === '1'

type ChroniclingAmericaResult = Record<string, unknown> & {
  kind: 'chroniclingamerica.search'
  api: { provider: string; authentication: string; usesBrowserClickstream: boolean }
  query: { query: string; count: number; page: number }
  pagination: { returned: number; current: number; maxCount: number }
  items: Array<Record<string, unknown>>
  storage: { mode?: string | undefined; persisted?: boolean | undefined }
}

test('Chronicling America live e2e covers LOC JSON search and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const args = ['apis', 'run', 'chroniclingamerica.search', '--online', '--persist', '--format', 'json', '--', '--query', 'lincoln', '--count', '5', '--page', '1']
    const online = await runJson<ChroniclingAmericaResult>(args, env)
    assert.equal(online.kind, 'chroniclingamerica.search')
    assert.equal(online.api.provider, 'chroniclingamerica')
    assert.equal(online.api.authentication, 'none')
    assert.equal(online.api.usesBrowserClickstream, false)
    assert.equal(online.query.query, 'lincoln')
    assert.equal(online.query.count, 5)
    assert.equal(online.pagination.current, 1)
    assert.ok(online.items.length > 0)
    assert.equal(online.storage.persisted, true)

    const offline = await runJson<ChroniclingAmericaResult>(['apis', 'run', 'chroniclingamerica.search', '--offline', '--format', 'json', '--', '--query', 'lincoln', '--count', '5', '--page', '1'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.items, online.items)

    const text = await runCli(['apis', 'run', 'chroniclingamerica.search', '--offline', '--format', 'text', '--', '--query', 'lincoln', '--count', '5', '--page', '1'], env)
    assert.match(text.stdout, /Chronicling America Search/)
    assert.match(text.stdout, /open REST API only · no auth/)
    assert.match(text.stdout, /no Chrome clickstream/)
  })
})

async function runJson<T extends Record<string, unknown>>(args: string[], env: NodeJS.ProcessEnv): Promise<T> {
  const result = await runCli(args, env)
  return JSON.parse(result.stdout) as T
}

async function runCli(args: string[], env: NodeJS.ProcessEnv): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync('npx', ['tsx', 'src/cli.ts', ...args], { cwd: process.cwd(), env, maxBuffer: 64 * 1024 * 1024 })
  return { stdout: stripAnsi(result.stdout), stderr: stripAnsi(result.stderr) }
}

async function withPublicApisHome(run: (publicApisHome: string) => Promise<void>): Promise<void> {
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-chroniclingamerica-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
