import { MeowFactsClient, type MeowFactsQuery } from '../../infrastructure/openApis/meowFactsClient.js'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export type MeowFactsInput = {
  count?: number | undefined
  id?: number | undefined
  lang?: string | undefined
}

export type MeowFactsApiMeta = {
  provider: 'meowfacts'
  publicApisProject: 'https://github.com/public-apis/public-apis'
  endpoint: 'GET /'
  docsUrl: 'https://github.com/wh-iterabb-it/meowfacts'
  usesBrowserClickstream: false
  authentication: 'none'
}

export type MeowFactsResult = {
  kind: 'meowfacts.facts'
  api: MeowFactsApiMeta
  query: Required<Pick<MeowFactsQuery, 'count'>> & Omit<MeowFactsQuery, 'count'>
  count: number
  facts: string[]
}

export async function getMeowFacts(input: MeowFactsInput = {}): Promise<MeowFactsResult> {
  const query = normalizeMeowFactsInput(input)
  const client = new MeowFactsClient()
  const response = await client.getFacts(query)
  return {
    kind: 'meowfacts.facts',
    api: {
      provider: 'meowfacts',
      publicApisProject: 'https://github.com/public-apis/public-apis',
      endpoint: 'GET /',
      docsUrl: 'https://github.com/wh-iterabb-it/meowfacts',
      usesBrowserClickstream: false,
      authentication: 'none',
    },
    query,
    count: response.data.length,
    facts: response.data,
  }
}

function normalizeMeowFactsInput(input: MeowFactsInput): MeowFactsResult['query'] {
  return {
    count: normalizeCount(input.count),
    id: normalizeOptionalId(input.id),
    lang: normalizeOptionalText(input.lang),
  }
}

function normalizeCount(value: number | undefined): number {
  const count = value ?? 1
  if (!Number.isInteger(count) || count < 1 || count > 50) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'MeowFacts --count must be an integer from 1 to 50.', {
      count: value,
    })
  }
  return count
}

function normalizeOptionalId(value: number | undefined): number | undefined {
  if (value === undefined) {
    return undefined
  }
  if (!Number.isInteger(value) || value < 0) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'MeowFacts --id must be a non-negative integer.', {
      id: value,
    })
  }
  return value
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  const normalized = value?.trim()
  return normalized === undefined || normalized === '' ? undefined : normalized.toLowerCase()
}
