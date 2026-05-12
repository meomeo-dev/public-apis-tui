import {
  PORTFOLIO_OPTIMIZER_MAX_ASSETS,
  PortfolioOptimizerClient,
  normalizePortfolioOptimizerMinimumVarianceInput,
  type PortfolioOptimizerMinimumVarianceInput,
  type PortfolioOptimizerRateLimit,
} from '../../infrastructure/openApis/portfolioOptimizerClient.js'

type PortfolioOptimizerApiMeta = {
  provider: 'portfoliooptimizer'
  publicApisProject: string
  endpoint: 'POST /v1/portfolios/optimization/minimum-variance'
  docsUrl: string
  usesBrowserClickstream: false
  authentication: 'none'
  transport: 'HTTPS JSON REST'
  rateLimit: string
}

export type PortfolioOptimizerMinimumVarianceUsecaseResult = {
  kind: 'portfoliooptimizer.minimumVariance'
  api: PortfolioOptimizerApiMeta
  query: {
    assets: number
    covarianceMatrix: number[][]
    minimumWeights?: number[] | undefined
    maximumWeights?: number[] | undefined
  }
  count: number
  pagination: {
    returned: number
    maxAssets: number
  }
  portfolio: {
    assetsWeights: number[]
    totalWeight: number
    nonZeroAssets: number
  }
  rateLimit: PortfolioOptimizerRateLimit
}

export async function optimizePortfolioMinimumVariance(
  input: PortfolioOptimizerMinimumVarianceInput = {},
): Promise<PortfolioOptimizerMinimumVarianceUsecaseResult> {
  const query = normalizePortfolioOptimizerMinimumVarianceInput(input)
  const client = new PortfolioOptimizerClient()
  const response = await client.optimizeMinimumVariance(query)
  return {
    kind: 'portfoliooptimizer.minimumVariance',
    api: {
      provider: 'portfoliooptimizer',
      publicApisProject: 'https://github.com/public-apis/public-apis',
      endpoint: 'POST /v1/portfolios/optimization/minimum-variance',
      docsUrl: 'https://docs.portfoliooptimizer.io/#post-/portfolios/optimization/minimum-variance',
      usesBrowserClickstream: false,
      authentication: 'none',
      transport: 'HTTPS JSON REST',
      rateLimit: 'Anonymous requests are allowed but limited; live probe observed ratelimit-limit=1 per second on 2026-05-04.',
    },
    query,
    count: response.data.assetsWeights.length,
    pagination: {
      returned: response.data.assetsWeights.length,
      maxAssets: PORTFOLIO_OPTIMIZER_MAX_ASSETS,
    },
    portfolio: {
      assetsWeights: response.data.assetsWeights,
      totalWeight: sum(response.data.assetsWeights),
      nonZeroAssets: response.data.assetsWeights.filter(weight => Math.abs(weight) > 0.000000001).length,
    },
    rateLimit: response.rateLimit,
  }
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0)
}
