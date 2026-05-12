import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const liveEnabled = process.env.PUBLIC_APIS_LIVE_E2E === '1'

type ArbeitnowResult = Record<string, unknown> & {
  kind: 'arbeitnow.jobs'
  api: { provider: string; authentication: string; usesBrowserClickstream: boolean }
  query: { page: number; visaSponsorship?: boolean | undefined }
  pagination: { returned: number; currentPage: number; pageSize: number }
  jobs: Array<Record<string, unknown>>
  storage: { mode?: string | undefined; persisted?: boolean | undefined }
}

test('Arbeitnow live e2e covers jobs and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<ArbeitnowResult>(['apis', 'run', 'arbeitnow.jobs', '--online', '--persist', '--format', 'json', '--', '--page', '1', '--visa-sponsorship', 'true'], env)
    assert.equal(online.kind, 'arbeitnow.jobs')
    assert.equal(online.api.provider, 'arbeitnow')
    assert.equal(online.api.authentication, 'none')
    assert.equal(online.api.usesBrowserClickstream, false)
    assert.equal(online.query.page, 1)
    assert.equal(online.query.visaSponsorship, true)
    assert.equal(online.pagination.currentPage, 1)
    assert.ok(online.pagination.returned >= 0)
    assert.equal(online.storage.persisted, true)

    const offline = await runJson<ArbeitnowResult>(['apis', 'run', 'arbeitnow.jobs', '--offline', '--format', 'json', '--', '--page', '1', '--visa-sponsorship', 'true'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.jobs, online.jobs)

    const text = await runCli(['apis', 'run', 'arbeitnow.jobs', '--offline', '--format', 'text', '--', '--page', '1', '--visa-sponsorship', 'true'], env)
    assert.match(text.stdout, /Arbeitnow Jobs/)
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
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-arbeitnow-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
