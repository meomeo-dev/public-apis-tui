import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const liveEnabled = process.env.PUBLIC_APIS_LIVE_E2E === '1'

type UrantiaResult = Record<string, unknown> & {
  kind: string
  api: {
    provider: string
    authentication: string
    usesBrowserClickstream: boolean
  }
  storage: { mode?: string | undefined; persisted?: boolean | undefined }
}

test('Urantia live e2e covers core operations and offline replay', {
  skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live APIs',
}, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const cases: Array<{
      operation: string
      args: string[]
      text: RegExp
      check: (result: UrantiaResult) => void
    }> = [
      {
        operation: 'urantia.toc',
        args: ['--limit', '2'],
        text: /Urantia Papers TOC/,
        check: result => assert.equal(Array.isArray(result.parts), true),
      },
      {
        operation: 'urantia.paper',
        args: ['--paper-id', '0', '--limit', '2'],
        text: /Urantia Paper/,
        check: result => assert.equal(Array.isArray(result.paragraphs), true),
      },
      {
        operation: 'urantia.paragraph',
        args: ['--ref', '0:0.1'],
        text: /Urantia Paragraph/,
        check: result => assert.equal(typeof result.paragraph, 'object'),
      },
      {
        operation: 'urantia.search',
        args: ['--query', 'thought adjuster', '--limit', '3'],
        text: /Urantia Full-Text Search/,
        check: result => assert.equal(Array.isArray(result.paragraphs), true),
      },
    ]

    for (const entry of cases) {
      const online = await runJson<UrantiaResult>([
        'apis',
        'run',
        entry.operation,
        '--online',
        '--persist',
        '--format',
        'json',
        '--',
        ...entry.args,
      ], env)
      assert.equal(online.kind, entry.operation)
      assert.equal(online.api.provider, 'urantia')
      assert.equal(online.api.authentication, 'none')
      assert.equal(online.api.usesBrowserClickstream, false)
      assert.equal(online.storage.persisted, true)
      entry.check(online)

      const offline = await runJson<UrantiaResult>([
        'apis',
        'run',
        entry.operation,
        '--offline',
        '--format',
        'json',
        '--',
        ...entry.args,
      ], env)
      assert.equal(offline.storage.mode, 'offline')
      assert.equal(offline.kind, online.kind)

      const text = await runCli([
        'apis',
        'run',
        entry.operation,
        '--offline',
        '--format',
        'text',
        '--',
        ...entry.args,
      ], env)
      assert.match(text.stdout, entry.text)
      assert.match(text.stdout, /open REST API only · no auth/)
      assert.match(text.stdout, /audio\/video\/html fields omitted/)
      assert.doesNotMatch(text.stdout, /https:\/\/audio\.urantia\.dev/)
      assert.doesNotMatch(text.stdout, /<span/)
    }
  })
})

async function runJson<T extends Record<string, unknown>>(
  args: string[],
  env: NodeJS.ProcessEnv,
): Promise<T> {
  const result = await runCli(args, env)
  return JSON.parse(result.stdout) as T
}

async function runCli(
  args: string[],
  env: NodeJS.ProcessEnv,
): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync('npx', ['tsx', 'src/cli.ts', ...args], {
    cwd: process.cwd(),
    env,
    maxBuffer: 2 * 1024 * 1024,
  })
  return { stdout: stripAnsi(result.stdout), stderr: stripAnsi(result.stderr) }
}

async function withPublicApisHome(
  run: (publicApisHome: string) => Promise<void>,
): Promise<void> {
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-urantia-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
