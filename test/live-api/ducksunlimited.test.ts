import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const live = process.env.PUBLIC_APIS_LIVE_E2E === '1'

test('Ducks Unlimited live chapters verify JSON, text output, and offline replay', { skip: live ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome, NO_COLOR: '1' }
    const online = await runJson<DucksUnlimitedChaptersLive>(['apis', 'run', 'ducksunlimited.chapters', '--online', '--persist', '--format', 'json', '--', '--state', 'TX', '--limit', '5', '--include-geometry', 'true'], env)
    assert.equal(online.kind, 'ducksunlimited.chapters')
    assert.equal(online.api.authentication, 'none')
    assert.equal(online.api.usesBrowserClickstream, false)
    assert.equal(online.query.state, 'TX')
    assert.ok(online.chapters.length > 0)
    assert.equal(online.chapters.every(chapter => chapter.state === 'TX'), true)
    assert.equal(online.storage.persisted, true)

    const offline = await runJson<DucksUnlimitedChaptersLive>(['apis', 'run', 'ducksunlimited.chapters', '--offline', '--format', 'json', '--', '--state', 'TX', '--limit', '5', '--include-geometry', 'true'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.chapters, online.chapters)

    const text = await runCli(['apis', 'run', 'ducksunlimited.chapters', '--offline', '--format', 'text', '--', '--state', 'TX', '--limit', '5', '--include-geometry', 'true'], env)
    assert.match(text.stdout, /Ducks Unlimited University Chapters/)
    assert.match(text.stdout, /open REST API only · no auth/)
    assert.match(text.stdout, /CC BY-NC|Creative Commons/)
  })
})

type DucksUnlimitedChaptersLive = {
  kind: 'ducksunlimited.chapters'
  api: { authentication: 'none'; usesBrowserClickstream: false }
  query: { state?: string | undefined }
  chapters: Array<{ state?: string | undefined }>
  storage: { mode: 'online' | 'offline'; persisted: boolean }
}

async function runJson<T extends Record<string, unknown>>(args: string[], env: NodeJS.ProcessEnv): Promise<T> {
  const result = await runCli(args, env)
  return JSON.parse(result.stdout) as T
}

async function runCli(args: string[], env: NodeJS.ProcessEnv): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync('npx', ['tsx', 'src/cli.ts', ...args], { cwd: process.cwd(), env, maxBuffer: 4 * 1024 * 1024 })
  return { stdout: stripAnsi(result.stdout), stderr: stripAnsi(result.stderr) }
}

async function withPublicApisHome(run: (publicApisHome: string) => Promise<void>): Promise<void> {
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-ducksunlimited-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
