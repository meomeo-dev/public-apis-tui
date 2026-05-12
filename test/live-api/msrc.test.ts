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

type MsrcResult = Record<string, unknown> & {
  kind: 'msrc.vulnerabilities'
  api: PublicApiMeta
  vulnerabilities: Array<{ cveNumber: string; title: string }>
  storage: StorageMeta
}

test('MSRC live e2e covers vulnerabilities and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome, NO_COLOR: '1' }
    const vulnerabilities = await runJson<MsrcResult>(['apis', 'run', 'msrc.vulnerabilities', '--online', '--persist', '--format', 'json', '--', '--release-number', '2026-May', '--limit', '3'], env)
    assert.equal(vulnerabilities.kind, 'msrc.vulnerabilities')
    assert.equal(vulnerabilities.api.provider, 'msrc')
    assert.equal(vulnerabilities.api.authentication, 'none')
    assert.equal(vulnerabilities.api.usesBrowserClickstream, false)
    assert.ok(vulnerabilities.vulnerabilities.length > 0)
    assert.equal(vulnerabilities.storage.persisted, true)

    const vulnerabilitiesOffline = await runJson<MsrcResult>(['apis', 'run', 'msrc.vulnerabilities', '--offline', '--format', 'json', '--', '--release-number', '2026-May', '--limit', '3'], env)
    assert.equal(vulnerabilitiesOffline.storage.mode, 'offline')
    assert.deepEqual(vulnerabilitiesOffline.vulnerabilities, vulnerabilities.vulnerabilities)

    const text = await runCli(['apis', 'run', 'msrc.vulnerabilities', '--offline', '--format', 'text', '--', '--release-number', '2026-May', '--limit', '3'], env)
    assert.match(text.stdout, /MSRC Security Update Guide Vulnerabilities/)
    assert.match(text.stdout, /open REST API only · no auth/)
    assert.match(text.stdout, /read-only public metadata/)
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
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-msrc-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
