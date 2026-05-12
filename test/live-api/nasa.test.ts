import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const liveEnabled = process.env.PUBLIC_APIS_LIVE_E2E === '1'

type NasaSearchResult = Record<string, unknown> & {
  kind: string
  api: {
    provider: string
    authentication: string
    usesBrowserClickstream: boolean
    transport: string
  }
  items: Array<{ nasaId: string; title: string }>
  storage: { mode?: string; persisted?: boolean }
}

type NasaAssetResult = Record<string, unknown> & {
  kind: string
  api: {
    provider: string
    authentication: string
    usesBrowserClickstream: boolean
  }
  files: Array<{ href: string; role: string }>
  storage: { mode?: string; persisted?: boolean }
}

test('NASA live e2e covers search, asset, text, and offline replay', {
  skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs',
}, async () => {
  const searchArgs = [
    'apis',
    'run',
    'nasa.search',
    '--format',
    'json',
    '--',
    '--query',
    'apollo 11',
    '--media-type',
    'image',
    '--page-size',
    '2',
  ]
  const search = await runJson<NasaSearchResult>(searchArgs)
  assert.equal(search.kind, 'nasa.search')
  assert.equal(search.api.provider, 'nasa')
  assert.equal(search.api.authentication, 'none')
  assert.equal(search.api.usesBrowserClickstream, false)
  assert.equal(search.api.transport, 'HTTPS JSON REST')
  assert.equal(search.items.length > 0, true)

  const text = await runCli([
    'apis',
    'run',
    'nasa.search',
    '--format',
    'text',
    '--',
    '--query',
    'apollo 11',
    '--media-type',
    'image',
    '--page-size',
    '2',
  ])
  assert.match(text.stdout, /NASA Image Library Search/)
  assert.match(text.stdout, /open REST API only · no auth/)
  assert.match(text.stdout, /no Chrome clickstream/)
  assert.match(text.stdout, /api\.nasa\.gov .*intentionally excluded/)

  const assetId = search.items[0]?.nasaId ?? 'as11-40-5874'
  const asset = await runJson<NasaAssetResult>([
    'apis',
    'run',
    'nasa.asset',
    '--format',
    'json',
    '--',
    '--nasa-id',
    assetId,
    '--limit',
    '3',
  ])
  assert.equal(asset.kind, 'nasa.asset')
  assert.equal(asset.api.provider, 'nasa')
  assert.equal(asset.api.authentication, 'none')
  assert.equal(asset.api.usesBrowserClickstream, false)
  assert.equal(asset.files.length > 0, true)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const onlineSearch = await runJson<NasaSearchResult>([
      'apis',
      'run',
      'nasa.search',
      '--online',
      '--persist',
      '--format',
      'json',
      '--',
      '--query',
      'apollo 11',
      '--media-type',
      'image',
      '--page-size',
      '2',
    ], env)
    assert.equal(onlineSearch.storage.persisted, true)

    const offlineSearch = await runJson<NasaSearchResult>([
      'apis',
      'run',
      'nasa.search',
      '--offline',
      '--format',
      'json',
      '--',
      '--query',
      'apollo 11',
      '--media-type',
      'image',
      '--page-size',
      '2',
    ], env)
    assert.equal(offlineSearch.storage.mode, 'offline')
    assert.deepEqual(offlineSearch.items, onlineSearch.items)

    const onlineAsset = await runJson<NasaAssetResult>([
      'apis',
      'run',
      'nasa.asset',
      '--online',
      '--persist',
      '--format',
      'json',
      '--',
      '--nasa-id',
      assetId,
      '--limit',
      '3',
    ], env)
    assert.equal(onlineAsset.storage.persisted, true)

    const offlineAsset = await runJson<NasaAssetResult>([
      'apis',
      'run',
      'nasa.asset',
      '--offline',
      '--format',
      'json',
      '--',
      '--nasa-id',
      assetId,
      '--limit',
      '3',
    ], env)
    assert.equal(offlineAsset.storage.mode, 'offline')
    assert.deepEqual(offlineAsset.files, onlineAsset.files)
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
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-nasa-'))
  try {
    await callback(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}
