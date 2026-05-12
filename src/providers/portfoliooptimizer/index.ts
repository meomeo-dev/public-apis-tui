import { z } from 'zod'
import { optimizePortfolioMinimumVariance } from '../../application/usecases/portfolioOptimizer.js'
import {
  PORTFOLIO_OPTIMIZER_DEFAULT_ASSETS,
  PORTFOLIO_OPTIMIZER_MAX_ASSETS,
  normalizePortfolioOptimizerMinimumVarianceInput,
  type PortfolioOptimizerMinimumVarianceInput,
} from '../../infrastructure/openApis/portfolioOptimizerClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const minimumVarianceParamsSchema = z.object({
  assets: z.coerce.number().optional(),
  covarianceMatrix: z.union([z.string(), z.array(z.array(z.number()))]).optional(),
  minimumWeights: z.union([z.string(), z.array(z.number())]).optional(),
  maximumWeights: z.union([z.string(), z.array(z.number())]).optional(),
}) satisfies z.ZodType<PortfolioOptimizerMinimumVarianceInput>

const minimumVarianceOperation: PublicApiOperationDefinition<PortfolioOptimizerMinimumVarianceInput> = {
  id: 'portfoliooptimizer.minimumVariance',
  providerId: 'portfoliooptimizer',
  name: 'Minimum Variance Portfolio',
  commandPath: ['portfoliooptimizer', 'minimum-variance'],
  rpcMethod: 'portfoliooptimizer.minimumVariance',
  description: 'Compute minimum-variance portfolio weights from a covariance matrix.',
  category: 'finance',
  options: [
    {
      name: 'assets',
      flag: '--assets <count>',
      description: `Asset count, default ${PORTFOLIO_OPTIMIZER_DEFAULT_ASSETS}, CLI cap ${PORTFOLIO_OPTIMIZER_MAX_ASSETS}`,
      exposure: 'primary',
      group: 'query',
      reason: 'The endpoint requires the number of assets; exposing it keeps matrix validation explicit for terminal users.',
      valueType: 'integer',
      defaultValue: String(PORTFOLIO_OPTIMIZER_DEFAULT_ASSETS),
    },
    {
      name: 'covarianceMatrix',
      flag: '--covariance-matrix <json>',
      description: 'Square covariance matrix JSON; default is a 3-asset demo matrix',
      exposure: 'primary',
      group: 'query',
      reason: 'The covariance matrix is the core input to the minimum-variance optimization.',
      valueType: 'string',
      valueLabel: 'json',
    },
    {
      name: 'minimumWeights',
      flag: '--minimum-weights <json>',
      description: 'Optional minimum asset weights JSON array',
      exposure: 'advanced',
      group: 'filters',
      reason: 'Weight constraints are useful but add optimization complexity, so they are advanced options.',
      valueType: 'string',
      valueLabel: 'json',
    },
    {
      name: 'maximumWeights',
      flag: '--maximum-weights <json>',
      description: 'Optional maximum asset weights JSON array',
      exposure: 'advanced',
      group: 'filters',
      reason: 'Weight constraints are useful but add optimization complexity, so they are advanced options.',
      valueType: 'string',
      valueLabel: 'json',
    },
  ],
  paramsSchema: minimumVarianceParamsSchema,
  execute: params => optimizePortfolioMinimumVariance(params),
  normalizeParams: params => minimumVarianceParamsSchema.parse(params),
  createCacheKeyParams: params => normalizePortfolioOptimizerMinimumVarianceInput(params),
  resultKind: 'portfoliooptimizer.minimumVariance',
  defaultFormat: 'text',
}

export const portfolioOptimizerProvider: PublicApiProviderModule = {
  manifest: {
    id: 'portfoliooptimizer',
    name: 'Portfolio Optimizer',
    description: 'Anonymous HTTPS JSON portfolio analysis and optimization API.',
    publicApisCategory: 'Finance',
    homepageUrl: 'https://portfoliooptimizer.io/',
    docsUrl: 'https://docs.portfoliooptimizer.io/',
    auth: {
      mode: 'none',
      notes: ['Official docs support anonymous users with no authentication information required; API keys only raise limits.'],
    },
    tags: ['finance', 'portfolio', 'optimization', 'commercial-analysis', 'anonymous', 'json'],
    freePlanNotes: [
      'Anonymous mode has strict but reasonable API limits.',
      'Live probe on 2026-05-04 observed response rate-limit headers with limit 1 per second.',
      `CLI caps assets at ${PORTFOLIO_OPTIMIZER_MAX_ASSETS} to keep anonymous requests quota-conscious and terminal-readable.`,
    ],
  },
  operations: [minimumVarianceOperation],
  endpoints: [
    {
      id: 'portfoliooptimizer-minimum-variance',
      method: 'POST',
      urlPattern: 'https://api.portfoliooptimizer.io/v1/portfolios/optimization/minimum-variance',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Portfolio Optimizer anonymous minimum-variance portfolio optimization endpoint.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-04',
      sampleSources: [
        'https://docs.portfoliooptimizer.io/',
        'https://docs.portfoliooptimizer.io/openapi/portfoliooptimizer.yaml',
        'https://api.portfoliooptimizer.io/v1/portfolios/optimization/minimum-variance',
      ],
      consumedBy: ['portfoliooptimizer minimum-variance'],
      notes: ['No API key required for anonymous requests.', 'No browser clickstream or scraping required.', 'Rate-limit headers observed on live responses.'],
    },
  ],
}
