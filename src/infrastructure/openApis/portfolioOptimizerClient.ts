import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const PORTFOLIO_OPTIMIZER_DEFAULT_BASE_URL = 'https://api.portfoliooptimizer.io/v1'
export const PORTFOLIO_OPTIMIZER_DEFAULT_ASSETS = 3
export const PORTFOLIO_OPTIMIZER_MAX_ASSETS = 10
const DEFAULT_COVARIANCE_MATRIX = [
  [0.01, 0.0018, 0.0011],
  [0.0018, 0.0225, 0.0026],
  [0.0011, 0.0026, 0.04],
]

export type PortfolioOptimizerMinimumVarianceInput = {
  assets?: number | undefined
  covarianceMatrix?: string | number[][] | undefined
  minimumWeights?: string | number[] | undefined
  maximumWeights?: string | number[] | undefined
}

export type NormalizedPortfolioOptimizerMinimumVarianceInput = {
  assets: number
  covarianceMatrix: number[][]
  minimumWeights?: number[] | undefined
  maximumWeights?: number[] | undefined
}

export type PortfolioOptimizerMinimumVarianceResult = {
  assetsWeights: number[]
}

export type PortfolioOptimizerRateLimit = {
  limit?: string | undefined
  remaining?: string | undefined
  reset?: string | undefined
}

export type PortfolioOptimizerResponse<T> = {
  data: T
  rateLimit: PortfolioOptimizerRateLimit
}

export class PortfolioOptimizerClient {
  constructor(private readonly options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {}

  async optimizeMinimumVariance(
    input: NormalizedPortfolioOptimizerMinimumVarianceInput,
  ): Promise<PortfolioOptimizerResponse<PortfolioOptimizerMinimumVarianceResult>> {
    const url = new URL('portfolios/optimization/minimum-variance', normalizeBaseUrl(this.options.baseUrl ?? PORTFOLIO_OPTIMIZER_DEFAULT_BASE_URL))
    const body: Record<string, unknown> = {
      assets: input.assets,
      assetsCovarianceMatrix: input.covarianceMatrix,
    }
    if (input.minimumWeights !== undefined || input.maximumWeights !== undefined) {
      body.constraints = {
        ...(input.minimumWeights !== undefined ? { minimumAssetsWeights: input.minimumWeights } : {}),
        ...(input.maximumWeights !== undefined ? { maximumAssetsWeights: input.maximumWeights } : {}),
      }
    }
    const response = await this.fetchJson(url, body)
    return {
      data: parseMinimumVarianceResponse(response.parsed),
      rateLimit: readRateLimit(response.headers),
    }
  }

  private async fetchJson(url: URL, body: Record<string, unknown>): Promise<{ parsed: unknown; headers: Headers }> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
        },
        body: JSON.stringify(body),
      })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Portfolio Optimizer request failed: ${String(error)}`, {
        provider: 'portfoliooptimizer',
        endpoint: url.href,
      })
    }

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Portfolio Optimizer returned a non-JSON response: ${String(error)}`, {
        provider: 'portfoliooptimizer',
        status: response.status,
        endpoint: url.href,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        readApiError(parsed) ?? `Portfolio Optimizer request failed with HTTP ${response.status}.`,
        {
          provider: 'portfoliooptimizer',
          status: response.status,
          endpoint: url.href,
          response: parsed,
        },
      )
    }

    return { parsed, headers: response.headers }
  }
}

export function normalizePortfolioOptimizerMinimumVarianceInput(
  input: PortfolioOptimizerMinimumVarianceInput = {},
): NormalizedPortfolioOptimizerMinimumVarianceInput {
  const usesDefaultCovarianceMatrix = input.covarianceMatrix === undefined
  const covarianceMatrix = normalizeMatrix(input.covarianceMatrix ?? DEFAULT_COVARIANCE_MATRIX, 'covariance-matrix')
  const assets = input.assets ?? covarianceMatrix.length
  if (!Number.isInteger(assets) || assets < 2 || assets > PORTFOLIO_OPTIMIZER_MAX_ASSETS) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `--assets must be an integer from 2 to ${PORTFOLIO_OPTIMIZER_MAX_ASSETS}.`)
  }
  if (usesDefaultCovarianceMatrix && input.assets !== undefined && assets !== covarianceMatrix.length) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `--assets ${assets} needs a matching --covariance-matrix with ${assets} rows; omit --assets to use the default ${DEFAULT_COVARIANCE_MATRIX.length}-asset demo matrix.`,
    )
  }
  assertSquareMatrix(covarianceMatrix, assets, 'covariance-matrix')
  const minimumWeights = input.minimumWeights === undefined ? undefined : normalizeWeightVector(input.minimumWeights, assets, 'minimum-weights')
  const maximumWeights = input.maximumWeights === undefined ? undefined : normalizeWeightVector(input.maximumWeights, assets, 'maximum-weights')
  validateWeightConstraints(minimumWeights, maximumWeights)
  return {
    assets,
    covarianceMatrix,
    ...(minimumWeights !== undefined ? { minimumWeights } : {}),
    ...(maximumWeights !== undefined ? { maximumWeights } : {}),
  }
}

function parseMinimumVarianceResponse(value: unknown): PortfolioOptimizerMinimumVarianceResult {
  if (!isRecord(value) || !Array.isArray(value.assetsWeights)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Portfolio Optimizer response had an unexpected schema.')
  }
  const assetsWeights = value.assetsWeights.map((entry, index) => normalizeFiniteNumber(entry, `assetsWeights[${index}]`))
  if (assetsWeights.length === 0) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Portfolio Optimizer response did not include asset weights.')
  }
  return { assetsWeights }
}

function normalizeMatrix(value: string | number[][], label: string): number[][] {
  const parsed = typeof value === 'string' ? parseJsonOption(value, label) : value
  if (!Array.isArray(parsed)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `--${label} must be a JSON number matrix.`)
  }
  return parsed.map((row, rowIndex) => {
    if (!Array.isArray(row)) {
      throw new RuntimeFailure('INVALID_ARGUMENT', `--${label} row ${rowIndex + 1} must be an array.`)
    }
    return row.map((entry, columnIndex) => normalizeFiniteNumber(entry, `${label}[${rowIndex}][${columnIndex}]`))
  })
}

function normalizeWeightVector(value: string | number[], assets: number, label: string): number[] {
  const parsed = typeof value === 'string' ? parseJsonOption(value, label) : value
  if (!Array.isArray(parsed) || parsed.length !== assets) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `--${label} must be a JSON array with ${assets} weights.`)
  }
  return parsed.map((entry, index) => {
    const weight = normalizeFiniteNumber(entry, `${label}[${index}]`)
    if (weight < 0 || weight > 1) {
      throw new RuntimeFailure('INVALID_ARGUMENT', `--${label} weights must be between 0 and 1.`)
    }
    return weight
  })
}

function validateWeightConstraints(minimumWeights: number[] | undefined, maximumWeights: number[] | undefined): void {
  if (minimumWeights === undefined && maximumWeights === undefined) {
    return
  }
  if (minimumWeights !== undefined && sumNumbers(minimumWeights) > 1) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--minimum-weights total must be less than or equal to 1.')
  }
  if (maximumWeights !== undefined && sumNumbers(maximumWeights) < 1) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--maximum-weights total must be greater than or equal to 1.')
  }
  if (minimumWeights === undefined || maximumWeights === undefined) {
    return
  }
  for (let index = 0; index < minimumWeights.length; index += 1) {
    const minimumWeight = minimumWeights[index]
    const maximumWeight = maximumWeights[index]
    if (minimumWeight === undefined || maximumWeight === undefined) {
      throw new RuntimeFailure('INVALID_ARGUMENT', '--minimum-weights and --maximum-weights must have the same asset count.')
    }
    if (minimumWeight > maximumWeight) {
      throw new RuntimeFailure('INVALID_ARGUMENT', `--minimum-weights asset ${index + 1} must be less than or equal to --maximum-weights asset ${index + 1}.`)
    }
  }
}

function sumNumbers(values: number[]): number {
  return values.reduce((total, value) => total + value, 0)
}

function assertSquareMatrix(matrix: number[][], assets: number, label: string): void {
  if (matrix.length !== assets) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `--${label} must contain ${assets} rows.`)
  }
  for (const row of matrix) {
    if (row.length !== assets) {
      throw new RuntimeFailure('INVALID_ARGUMENT', `--${label} must be a ${assets}x${assets} square matrix.`)
    }
  }
}

function parseJsonOption(value: string, label: string): unknown {
  try {
    return JSON.parse(value)
  } catch (error) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `--${label} must be valid JSON: ${String(error)}`)
  }
}

function normalizeFiniteNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must be a finite number.`)
  }
  return value
}

function readRateLimit(headers: Headers): PortfolioOptimizerRateLimit {
  return {
    limit: headers.get('ratelimit-limit') ?? headers.get('x-ratelimit-limit-second') ?? undefined,
    remaining: headers.get('ratelimit-remaining') ?? headers.get('x-ratelimit-remaining-second') ?? undefined,
    reset: headers.get('ratelimit-reset') ?? undefined,
  }
}

function readApiError(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  const message = value.message ?? value.error ?? value.detail
  return typeof message === 'string' && message.trim() !== '' ? message : undefined
}

function normalizeBaseUrl(value: string): string {
  return value.endsWith('/') ? value : `${value}/`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
