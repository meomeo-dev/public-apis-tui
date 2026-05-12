import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const liveEnabled = process.env.PUBLIC_APIS_LIVE_E2E === '1'

type NoctuaStatsResult = Record<string, unknown> & {
  kind: 'noctua.stats'
  api: {
    provider: 'noctua'
    authentication: 'none'
    usesBrowserClickstream: false
    transport: string
  }
  stats: {
    total: number
    byTypes: Array<{ type: string; count: number }>
  }
  storage: { mode?: string; persisted?: boolean }
}

type NoctuaSourceResult = Record<string, unknown> & {
  kind: 'noctua.source'
  api: {
    provider: 'noctua'
    authentication: 'none'
    usesBrowserClickstream: false
  }
  source: {
    shortName: string
    model?: string
    names: string[]
  }
  storage: { mode?: string; persisted?: boolean }
}

test('Noctua live e2e covers JSON, text, and offline replay', {
  skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs',
}, async () => {
  const stats = await runJson<NoctuaStatsResult>([
    'apis',
    'run',
    'noctua.stats',
    '--format',
    'json',
  ])
  assert.equal(stats.kind, 'noctua.stats')
  assert.equal(stats.api.provider, 'noctua')
  assert.equal(stats.api.authentication, 'none')
  assert.equal(stats.api.usesBrowserClickstream, false)
  assert.equal(stats.api.transport, 'HTTPS JSON REST')
  assert.ok(stats.stats.total > 0)
  assert.ok(stats.stats.byTypes.length > 0)

  const text = await runCli([
    'apis',
    'run',
    'noctua.source',
    '--format',
    'text',
    '--',
    '--name',
    'Mars',
  ])
  assert.match(text.stdout, /Noctua Sky Source/)
  assert.match(text.stdout, /open REST API only · no auth/)
  assert.match(text.stdout, /no Chrome clickstream/)
  assert.match(text.stdout, /Mars/)
  assert.match(text.stdout, /model jpl_sso/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<NoctuaSourceResult>([
      'apis',
      'run',
      'noctua.source',
      '--online',
      '--persist',
      '--format',
      'json',
      '--',
      '--name',
      'Mars',
    ], env)
    assert.equal(online.storage.persisted, true)
    assert.equal(online.source.shortName, 'Mars')

    const offline = await runJson<NoctuaSourceResult>([
      'apis',
      'run',
      'noctua.source',
      '--offline',
      '--format',
      'json',
      '--',
      '--name',
      'Mars',
    ], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.source, online.source)
  })
})

async function runJson<T extends Record<string, unknown>>(
  args: string[],
  env: NodeJS.ProcessEnv = process.env,
): Promise<T> {
  const result = await runCli(args, env)
  return JSON.parse(result.stdout) as T
}

async function runCli(
  args: string[],
  env: NodeJS.ProcessEnv = process.env,
): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync('npx', ['tsx', 'src/cli.ts', ...args], {
    cwd: process.cwd(),
    env,
    maxBuffer: 1024 * 1024 * 8,
  })
}

async function withPublicApisHome(
  callback: (publicApisHome: string) => Promise<void>,
): Promise<void> {
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-noctua-'))
  try {
    await callback(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}
