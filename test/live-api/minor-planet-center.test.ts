import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const liveEnabled = process.env.PUBLIC_APIS_LIVE_E2E === '1'

type MinorPlanetCenterSearchResult = Record<string, unknown> & {
  kind: string
  api: {
    provider: string
    authentication: string
    usesBrowserClickstream: boolean
    transport: string
  }
  query: {
    query: string
    maxEccentricity?: number | undefined
    limit: number
  }
  asteroids: Array<{ readableDesignation: string }>
  storage: { mode?: string; persisted?: boolean }
}

test('Minor Planet Center live e2e covers search, text, and offline replay', {
  skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs',
}, async () => {
  const search = await runJson<MinorPlanetCenterSearchResult>([
    'apis',
    'run',
    'minorplanetcenter.search',
    '--format',
    'json',
    '--',
    '--query',
    'Ceres',
    '--limit',
    '2',
  ])
  assert.equal(search.kind, 'minorplanetcenter.search')
  assert.equal(search.api.provider, 'minorplanetcenter')
  assert.equal(search.api.authentication, 'none')
  assert.equal(search.api.usesBrowserClickstream, false)
  assert.equal(search.api.transport, 'HTTPS JSON REST')
  assert.equal(
    search.asteroids.some(item => /Ceres/u.test(item.readableDesignation)),
    true,
  )

  const text = await runCli([
    'apis',
    'run',
    'minorplanetcenter.search',
    '--format',
    'text',
    '--',
    '--query',
    'Ceres',
    '--limit',
    '2',
  ])
  assert.match(text.stdout, /Minor Planet Center Asteroids/)
  assert.match(text.stdout, /open REST API only · no auth/)
  assert.match(text.stdout, /no Chrome clickstream/)
  assert.match(text.stdout, /Ceres/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<MinorPlanetCenterSearchResult>([
      'apis',
      'run',
      'minorplanetcenter.search',
      '--online',
      '--persist',
      '--format',
      'json',
      '--',
      '--query',
      'Ceres',
      '--limit',
      '2',
    ], env)
    assert.equal(online.storage.persisted, true)

    const offline = await runJson<MinorPlanetCenterSearchResult>([
      'apis',
      'run',
      'minorplanetcenter.search',
      '--offline',
      '--format',
      'json',
      '--',
      '--query',
      'Ceres',
      '--limit',
      '2',
    ], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.asteroids, online.asteroids)
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
  const result = await execFileAsync('npx', ['tsx', 'src/cli.ts', ...args], {
    cwd: process.cwd(),
    env,
    maxBuffer: 1024 * 1024 * 8,
  })
  return result
}

async function withPublicApisHome(
  callback: (publicApisHome: string) => Promise<void>,
): Promise<void> {
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-mpc-'))
  try {
    await callback(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}
