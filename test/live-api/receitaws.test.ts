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
type LookupResult = Record<string, unknown> & {
  kind: 'receitaws.lookup'
  api: PublicApiMeta
  query: { cnpj: string }
  company: { cnpj: string; name?: string | undefined; situation?: string | undefined }
  storage: StorageMeta
}

test('ReceitaWS live e2e covers CNPJ JSON, text, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome, NO_COLOR: '1' }
    const args = ['apis', 'run', 'receitaws.lookup', '--online', '--persist', '--format', 'json', '--', '--cnpj', '27865757000102']
    const online = await runJson<LookupResult>(args, env)
    assert.equal(online.kind, 'receitaws.lookup')
    assert.equal(online.api.provider, 'receitaws')
    assert.equal(online.api.authentication, 'none')
    assert.equal(online.api.usesBrowserClickstream, false)
    assert.equal(online.query.cnpj, '27865757000102')
    assert.equal(online.company.cnpj, '27865757000102')
    assert.equal(online.storage.persisted, true)

    const offline = await runJson<LookupResult>(['apis', 'run', 'receitaws.lookup', '--offline', '--format', 'json', '--', '--cnpj', '27865757000102'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.company, online.company)

    const text = await runCli(['apis', 'run', 'receitaws.lookup', '--offline', '--format', 'text', '--', '--cnpj', '27865757000102'], env)
    assert.match(text.stdout, /ReceitaWS CNPJ Lookup/)
    assert.match(text.stdout, /open REST API only · no auth/)
    assert.match(text.stdout, /no Chrome clickstream/)
  })
})

async function runJson<T extends Record<string, unknown>>(args: string[], env: NodeJS.ProcessEnv): Promise<T> {
  const result = await runCli(args, env)
  return JSON.parse(result.stdout) as T
}

async function runCli(args: string[], env: NodeJS.ProcessEnv): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync('npx', ['tsx', 'src/cli.ts', ...args], { cwd: process.cwd(), env, maxBuffer: 1024 * 1024 })
  return { stdout: stripAnsi(result.stdout), stderr: stripAnsi(result.stderr) }
}

async function withPublicApisHome(run: (publicApisHome: string) => Promise<void>): Promise<void> {
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-receitaws-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
