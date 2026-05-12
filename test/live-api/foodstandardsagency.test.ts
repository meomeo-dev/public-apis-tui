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

type AuthoritiesResult = Record<string, unknown> & {
  kind: 'foodstandardsagency.authorities'
  api: PublicApiMeta
  authorities: Array<{ id: number; name?: string | undefined }>
  storage: StorageMeta
}

type EstablishmentsResult = Record<string, unknown> & {
  kind: 'foodstandardsagency.establishments'
  api: PublicApiMeta
  establishments: Array<{ id: number; businessName?: string | undefined }>
  storage: StorageMeta
}

test('Food Standards Agency live e2e covers authorities, establishments, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome, NO_COLOR: '1' }
    const authorities = await runJson<AuthoritiesResult>(['apis', 'run', 'foodstandardsagency.authorities', '--online', '--persist', '--format', 'json', '--', '--limit', '5000'], env)
    assert.equal(authorities.kind, 'foodstandardsagency.authorities')
    assert.equal(authorities.api.provider, 'foodstandardsagency')
    assert.equal(authorities.api.authentication, 'none')
    assert.equal(authorities.api.usesBrowserClickstream, false)
    assert.ok(authorities.authorities.length > 0)
    assert.equal(authorities.storage.persisted, true)

    const authoritiesOffline = await runJson<AuthoritiesResult>(['apis', 'run', 'foodstandardsagency.authorities', '--offline', '--format', 'json', '--', '--limit', '5000'], env)
    assert.equal(authoritiesOffline.storage.mode, 'offline')
    assert.deepEqual(authoritiesOffline.authorities, authorities.authorities)

    const establishments = await runJson<EstablishmentsResult>(['apis', 'run', 'foodstandardsagency.establishments', '--online', '--persist', '--format', 'json', '--', '--query', 'coffee', '--page-size', '5000', '--page-number', '1'], env)
    assert.equal(establishments.kind, 'foodstandardsagency.establishments')
    assert.equal(establishments.api.authentication, 'none')
    assert.equal(establishments.api.usesBrowserClickstream, false)
    assert.ok(establishments.establishments.length > 0)
    assert.equal(establishments.storage.persisted, true)

    const establishmentsOffline = await runJson<EstablishmentsResult>(['apis', 'run', 'foodstandardsagency.establishments', '--offline', '--format', 'json', '--', '--query', 'coffee', '--page-size', '5000', '--page-number', '1'], env)
    assert.equal(establishmentsOffline.storage.mode, 'offline')
    assert.deepEqual(establishmentsOffline.establishments, establishments.establishments)

    const text = await runCli(['apis', 'run', 'foodstandardsagency.establishments', '--offline', '--format', 'text', '--', '--query', 'coffee', '--page-size', '5000', '--page-number', '1'], env)
    assert.match(text.stdout, /Food Standards Agency Establishments/)
    assert.match(text.stdout, /open REST API only · no auth/)
    assert.match(text.stdout, /no Chrome clickstream/)
  })
})

async function runJson<T extends Record<string, unknown>>(args: string[], env: NodeJS.ProcessEnv): Promise<T> {
  const result = await runCli(args, env)
  return JSON.parse(result.stdout) as T
}

async function runCli(args: string[], env: NodeJS.ProcessEnv): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync('npx', ['tsx', 'src/cli.ts', ...args], { cwd: process.cwd(), env, maxBuffer: 16 * 1024 * 1024 })
  return { stdout: stripAnsi(result.stdout), stderr: stripAnsi(result.stderr) }
}

async function withPublicApisHome(run: (publicApisHome: string) => Promise<void>): Promise<void> {
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-foodstandardsagency-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
