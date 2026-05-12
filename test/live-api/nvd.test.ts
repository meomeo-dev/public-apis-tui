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

type NvdResult = Record<string, unknown> & {
  kind: 'nvd.cves'
  api: PublicApiMeta
  cves: Array<{ id: string }>
  storage: StorageMeta
}

test('NVD live e2e covers CVEs and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome, NO_COLOR: '1' }
    const cves = await runJson<NvdResult>(['apis', 'run', 'nvd.cves', '--online', '--persist', '--format', 'json', '--', '--cve-id', 'CVE-2024-3094', '--limit', '1'], env)
    assert.equal(cves.kind, 'nvd.cves')
    assert.equal(cves.api.provider, 'nvd')
    assert.equal(cves.api.authentication, 'none')
    assert.equal(cves.api.usesBrowserClickstream, false)
    assert.equal(cves.cves[0]?.id, 'CVE-2024-3094')
    assert.equal(cves.storage.persisted, true)

    const cvesOffline = await runJson<NvdResult>(['apis', 'run', 'nvd.cves', '--offline', '--format', 'json', '--', '--cve-id', 'CVE-2024-3094', '--limit', '1'], env)
    assert.equal(cvesOffline.storage.mode, 'offline')
    assert.deepEqual(cvesOffline.cves, cves.cves)

    const text = await runCli(['apis', 'run', 'nvd.cves', '--offline', '--format', 'text', '--', '--cve-id', 'CVE-2024-3094', '--limit', '1'], env)
    assert.match(text.stdout, /National Vulnerability Database CVEs/)
    assert.match(text.stdout, /open REST API only · no auth/)
    assert.match(text.stdout, /read-only CVE metadata/)
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
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-nvd-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
