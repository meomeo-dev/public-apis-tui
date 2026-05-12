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

type SearchResult = Record<string, unknown> & {
  kind: 'indianpincode.search'
  api: PublicApiMeta
  results: Array<{ type: string; code?: string | undefined }>
  storage: StorageMeta
}

test('Indian Pincode live e2e covers JSON, text, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome, NO_COLOR: '1' }
    const search = await runJson<SearchResult>(['apis', 'run', 'indianpincode.search', '--online', '--persist', '--format', 'json', '--', '--query', 'mumbai', '--limit', '10'], env)
    assert.equal(search.kind, 'indianpincode.search')
    assert.equal(search.api.provider, 'indianpincode')
    assert.equal(search.api.authentication, 'none')
    assert.equal(search.api.usesBrowserClickstream, false)
    assert.ok(search.results.length > 0)
    assert.equal(search.storage.persisted, true)

    const offline = await runJson<SearchResult>(['apis', 'run', 'indianpincode.search', '--offline', '--format', 'json', '--', '--query', 'mumbai', '--limit', '10'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.results, search.results)

    const text = await runCli(['apis', 'run', 'indianpincode.search', '--offline', '--format', 'text', '--', '--query', 'mumbai', '--limit', '10'], env)
    assert.match(text.stdout, /Indian Pincode Search/)
    assert.match(text.stdout, /open REST API only · no auth/)
    assert.match(text.stdout, /no Chrome clickstream/)
    assert.match(text.stdout, /intentionally not scraped/)
  })
})

async function runJson<T extends Record<string, unknown>>(args: string[], env: NodeJS.ProcessEnv): Promise<T> {
  const result = await runCli(args, env)
  return JSON.parse(result.stdout) as T
}

async function runCli(args: string[], env: NodeJS.ProcessEnv): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync('npx', ['tsx', 'src/cli.ts', ...args], { cwd: process.cwd(), env, maxBuffer: 4 * 1024 * 1024 })
  return { stdout: stripAnsi(result.stdout), stderr: stripAnsi(result.stderr) }
}

async function withPublicApisHome(run: (publicApisHome: string) => Promise<void>): Promise<void> {
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-indianpincode-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
