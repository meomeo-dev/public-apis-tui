import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const live = process.env.PUBLIC_APIS_LIVE_E2E === '1'

test('Free Dictionary live define verifies JSON, text output, and offline replay', { skip: live ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const json = await runJson<FreeDictionaryLiveResult>(['apis', 'run', 'freedictionary.define', '--format', 'json', '--', '--word', 'hello', '--language', 'en', '--definition-limit', '3'])
  assert.equal(json.kind, 'freedictionary.define')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.query.word, 'hello')
  assert.ok(json.count.definitionsShown > 0)
  assert.ok(json.entries.length > 0)

  const text = await runCli(['apis', 'run', 'freedictionary.define', '--format', 'text', '--', '--word', 'hello', '--language', 'en', '--definition-limit', '3'])
  assert.match(text.stdout, /Free Dictionary Define/)
  assert.match(text.stdout, /open REST API only · no auth/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<FreeDictionaryLiveResult>(['apis', 'run', 'freedictionary.define', '--online', '--persist', '--format', 'json', '--', '--word', 'hello', '--language', 'en', '--definition-limit', '3'], env)
    const offline = await runJson<FreeDictionaryLiveResult>(['apis', 'run', 'freedictionary.define', '--offline', '--format', 'json', '--', '--word', 'hello', '--language', 'en', '--definition-limit', '3'], env)
    assert.equal(online.storage.persisted, true)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.entries, online.entries)
  })
})

type FreeDictionaryLiveResult = {
  kind: 'freedictionary.define'
  api: {
    authentication: 'none'
    usesBrowserClickstream: false
  }
  query: {
    word: string
  }
  entries: unknown[]
  count: {
    definitionsShown: number
  }
  storage: {
    mode: 'online' | 'offline'
    persisted: boolean
  }
}

async function runJson<T extends Record<string, unknown>>(args: string[], env: NodeJS.ProcessEnv = process.env): Promise<T> {
  const result = await runCli(args, env)
  return JSON.parse(result.stdout) as T
}

async function runCli(args: string[], env: NodeJS.ProcessEnv = process.env): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync('npx', ['tsx', 'src/cli.ts', ...args], {
    cwd: process.cwd(),
    env,
    maxBuffer: 4 * 1024 * 1024,
  })
  return { stdout: stripAnsi(result.stdout), stderr: stripAnsi(result.stderr) }
}

async function withPublicApisHome(run: (publicApisHome: string) => Promise<void>): Promise<void> {
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
