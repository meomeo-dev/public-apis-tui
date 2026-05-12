import assert from 'node:assert/strict'
import test from 'node:test'
import { optimizePortfolioMinimumVariance } from '../src/application/usecases/portfolioOptimizer.js'
import {
  PortfolioOptimizerClient,
  normalizePortfolioOptimizerMinimumVarianceInput,
} from '../src/infrastructure/openApis/portfolioOptimizerClient.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('Portfolio Optimizer client posts anonymous minimum-variance request', async () => {
  const client = new PortfolioOptimizerClient({
    fetchImpl: (async (input, init) => {
      const url = new URL(String(input))
      assert.equal(url.href, 'https://api.portfoliooptimizer.io/v1/portfolios/optimization/minimum-variance')
      assert.equal(init?.method, 'POST')
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>
      assert.equal(body.assets, 3)
      assert.deepEqual(body.assetsCovarianceMatrix, createCovarianceMatrix())
      return jsonResponse({ assetsWeights: [0.6245788660589642, 0.23740499218849087, 0.13801614175254476] }, {
        'ratelimit-limit': '1',
        'ratelimit-remaining': '0',
        'ratelimit-reset': '1',
      })
    }) as typeof fetch,
  })

  const result = await client.optimizeMinimumVariance(normalizePortfolioOptimizerMinimumVarianceInput({}))
  assert.deepEqual(result.data.assetsWeights.map(weight => Math.round(weight * 1000) / 1000), [0.625, 0.237, 0.138])
  assert.equal(result.rateLimit.limit, '1')
})

test('Portfolio Optimizer usecase projects TUI-ready JSON boundaries', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () =>
    jsonResponse({ assetsWeights: [0.6, 0.3, 0.1] }, {
      'ratelimit-limit': '1',
      'ratelimit-remaining': '0',
      'ratelimit-reset': '1',
    })) as typeof fetch

  try {
    const result = await optimizePortfolioMinimumVariance({})
    assert.equal(result.kind, 'portfoliooptimizer.minimumVariance')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.query.assets, 3)
    assert.equal(result.pagination.maxAssets, 10)
    assert.equal(result.portfolio.nonZeroAssets, 3)
    assert.equal(result.rateLimit.limit, '1')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Portfolio Optimizer normalizer validates matrix and constraint vectors', () => {
  assert.equal(normalizePortfolioOptimizerMinimumVarianceInput({}).assets, 3)
  assert.deepEqual(
    normalizePortfolioOptimizerMinimumVarianceInput({
      assets: 2,
      covarianceMatrix: '[[0.01,0.001],[0.001,0.02]]',
      minimumWeights: '[0,0.1]',
      maximumWeights: '[0.9,1]',
    }),
    {
      assets: 2,
      covarianceMatrix: [[0.01, 0.001], [0.001, 0.02]],
      minimumWeights: [0, 0.1],
      maximumWeights: [0.9, 1],
    },
  )
  assert.throws(() => normalizePortfolioOptimizerMinimumVarianceInput({ assets: 11 }), RuntimeFailure)
  assert.throws(() => normalizePortfolioOptimizerMinimumVarianceInput({ assets: 2 }), RuntimeFailure)
  assert.throws(() => normalizePortfolioOptimizerMinimumVarianceInput({ assets: 2, covarianceMatrix: 'not-json' }), RuntimeFailure)
  assert.throws(
    () => normalizePortfolioOptimizerMinimumVarianceInput({ assets: 3, minimumWeights: '[0.5,0.5,0.5]' }),
    /--minimum-weights total must be less than or equal to 1/u,
  )
  assert.throws(
    () => normalizePortfolioOptimizerMinimumVarianceInput({ assets: 3, maximumWeights: '[0.2,0.2,0.2]' }),
    /--maximum-weights total must be greater than or equal to 1/u,
  )
  assert.throws(
    () => normalizePortfolioOptimizerMinimumVarianceInput({ assets: 3, minimumWeights: '[0.4,0.1,0.1]', maximumWeights: '[0.3,0.8,0.8]' }),
    /--minimum-weights asset 1/u,
  )
})

function createCovarianceMatrix(): number[][] {
  return [
    [0.01, 0.0018, 0.0011],
    [0.0018, 0.0225, 0.0026],
    [0.0011, 0.0026, 0.04],
  ]
}

function jsonResponse(value: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json', ...headers } })
}
