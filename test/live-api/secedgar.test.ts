import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const liveEnabled = process.env.PUBLIC_APIS_LIVE_E2E === '1'

type StorageMeta = { mode?: string | undefined; persisted?: boolean | undefined }
type SecApiMeta = { provider: string; authentication: string; usesBrowserClickstream: boolean }
type SubmissionsResult = Record<string, unknown> & { kind: 'secedgar.submissions'; api: SecApiMeta; filings: unknown[]; storage: StorageMeta }
type ConceptResult = Record<string, unknown> & { kind: 'secedgar.companyConcept'; api: SecApiMeta; facts: unknown[]; storage: StorageMeta }

test('SEC EDGAR live e2e covers submissions, company concept, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-secedgar-'))
  try {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome, NO_COLOR: '1' }
    const submissions = await runJson<SubmissionsResult>(['apis', 'run', 'secedgar.submissions', '--online', '--persist', '--format', 'json', '--', '--cik', '0000320193', '--limit', '1000'], env)
    assert.equal(submissions.kind, 'secedgar.submissions')
    assert.equal(submissions.api.provider, 'secedgar')
    assert.equal(submissions.api.authentication, 'none')
    assert.equal(submissions.api.usesBrowserClickstream, false)
    assert.equal(submissions.storage.persisted, true)
    assert.ok(submissions.filings.length > 0)
    const submissionsOffline = await runJson<SubmissionsResult>(['apis', 'run', 'secedgar.submissions', '--offline', '--format', 'json', '--', '--cik', '0000320193', '--limit', '1000'], env)
    assert.deepEqual(submissionsOffline.filings, submissions.filings)

    const concept = await runJson<ConceptResult>(['apis', 'run', 'secedgar.companyConcept', '--online', '--persist', '--format', 'json', '--', '--cik', '0000320193', '--tag', 'AccountsPayableCurrent', '--limit', '1000'], env)
    assert.equal(concept.kind, 'secedgar.companyConcept')
    assert.equal(concept.api.authentication, 'none')
    assert.equal(concept.api.usesBrowserClickstream, false)
    assert.ok(concept.facts.length > 0)
    const conceptOffline = await runJson<ConceptResult>(['apis', 'run', 'secedgar.companyConcept', '--offline', '--format', 'json', '--', '--cik', '0000320193', '--tag', 'AccountsPayableCurrent', '--limit', '1000'], env)
    assert.deepEqual(conceptOffline.facts, concept.facts)

    const text = await runCli(['apis', 'run', 'secedgar.submissions', '--offline', '--format', 'text', '--', '--cik', '0000320193', '--limit', '1000'], env)
    assert.match(text.stdout, /SEC EDGAR Company Submissions/)
    assert.match(text.stdout, /open REST API only · no auth/)
    assert.match(text.stdout, /no Chrome clickstream/)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
})

async function runJson<T extends Record<string, unknown>>(args: string[], env: NodeJS.ProcessEnv): Promise<T> {
  const result = await runCli(args, env)
  return JSON.parse(result.stdout) as T
}

async function runCli(args: string[], env: NodeJS.ProcessEnv): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync('npx', ['tsx', 'src/cli.ts', ...args], { cwd: process.cwd(), env, maxBuffer: 4 * 1024 * 1024 })
  return { stdout: stripAnsi(result.stdout), stderr: stripAnsi(result.stderr) }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
