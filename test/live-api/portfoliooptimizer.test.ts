import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const liveEnabled = process.env.PUBLIC_APIS_LIVE_E2E === '1'

type PortfolioOptimizerLiveResult = {
  kind: 'portfoliooptimizer.minimumVariance'
  api: { provider: string; authentication: string; usesBrowserClickstream: boolean }
  query: { assets: number; covarianceMatrix: number[][] }
  portfolio: { assetsWeights: number[]; totalWeight: number }
  storage?: { mode?: string | undefined; persisted?: boolean | undefined }
}

test('Portfolio Optimizer live e2e covers minimum variance and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-portfoliooptimizer-'))
  try {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome, NO_COLOR: '1' }
    const args = ['apis', 'run', 'portfoliooptimizer.minimumVariance', '--online', '--persist', '--format', 'json', '--', '--assets', '3']
    const online = await runJson<PortfolioOptimizerLiveResult>(args, env)
    assert.equal(online.kind, 'portfoliooptimizer.minimumVariance')
    assert.equal(online.api.provider, 'portfoliooptimizer')
    assert.equal(online.api.authentication, 'none')
    assert.equal(online.api.usesBrowserClickstream, false)
    assert.equal(online.storage?.persisted, true)
    assert.equal(online.query.assets, 3)
    assert.equal(online.portfolio.assetsWeights.length, 3)
    assert.ok(Math.abs(online.portfolio.totalWeight - 1) < 0.001)

    const offline = await runJson<PortfolioOptimizerLiveResult>(['apis', 'run', 'portfoliooptimizer.minimumVariance', '--offline', '--format', 'json', '--', '--assets', '3'], env)
    assert.equal(offline.storage?.mode, 'offline')
    assert.deepEqual(offline.portfolio.assetsWeights, online.portfolio.assetsWeights)

    const text = await runCli(['apis', 'run', 'portfoliooptimizer.minimumVariance', '--offline', '--format', 'text', '--', '--assets', '3'], env)
    assert.match(text.stdout, /Portfolio Optimizer Minimum Variance/)
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
  const result = await execFileAsync('npx', ['tsx', 'src/cli.ts', ...args], { cwd: process.cwd(), env, maxBuffer: 1024 * 1024 })
  return { stdout: stripAnsi(result.stdout), stderr: stripAnsi(result.stderr) }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
