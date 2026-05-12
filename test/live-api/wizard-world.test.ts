import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const liveEnabled = process.env.PUBLIC_APIS_LIVE_E2E === '1'

type WizardWorldResult = Record<string, unknown> & {
  kind: string
  api: {
    provider: string
    authentication: string
    usesBrowserClickstream: boolean
    transport: string
  }
  query: { resource: string; name?: string; spellType?: string; limit: number }
  pagination: { total: number; matched: number; returned: number }
  items: Array<Record<string, unknown>>
  storage: { mode?: string; persisted?: boolean }
}

test('Wizard World live e2e covers catalog json, text, and offline replay', {
  skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs',
}, async () => {
  const json = await runJson<WizardWorldResult>([
    'apis',
    'run',
    'wizardworld.catalog',
    '--format',
    'json',
    '--',
    '--resource',
    'spells',
    '--name',
    'Patronus',
    '--limit',
    '5',
  ])
  assert.equal(json.kind, 'wizardworld.catalog')
  assert.equal(json.api.provider, 'wizardworld')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.api.transport, 'HTTPS JSON REST')
  assert.equal(json.query.resource, 'spells')
  assert.equal(json.query.name, 'Patronus')
  assert.equal(json.pagination.returned > 0, true)
  assert.equal(json.items.some(item => String(item.name).includes('Patronus')), true)

  const text = await runCli([
    'apis',
    'run',
    'wizardworld.catalog',
    '--format',
    'text',
    '--',
    '--resource',
    'elixirs',
    '--name',
    'Felix',
    '--limit',
    '3',
  ])
  assert.match(text.stdout, /Wizard World Catalog/)
  assert.match(text.stdout, /open REST API only · no auth/)
  assert.match(text.stdout, /no Chrome clickstream/)
  assert.match(text.stdout, /Felix Felicis/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<WizardWorldResult>([
      'apis',
      'run',
      'wizardworld.catalog',
      '--online',
      '--persist',
      '--format',
      'json',
      '--',
      '--resource',
      'spells',
      '--name',
      'Patronus',
      '--limit',
      '5',
    ], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<WizardWorldResult>([
      'apis',
      'run',
      'wizardworld.catalog',
      '--offline',
      '--format',
      'json',
      '--',
      '--resource',
      'spells',
      '--name',
      'Patronus',
      '--limit',
      '5',
    ], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.items, online.items)
    assert.deepEqual(offline.pagination, online.pagination)
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
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-wizard-world-'))
  try {
    await callback(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}
