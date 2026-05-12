import {
  GRUENSTROMINDEX_MAX_LIMIT,
  GruenstromIndexClient,
  normalizeGruenstromIndexForecastInput,
  type GruenstromIndexForecastEntry,
  type GruenstromIndexForecastInput,
  type GruenstromIndexLocation,
  type GruenstromIndexProvisioning,
} from '../../infrastructure/openApis/gruenstromindexClient.js'

export type GruenstromIndexForecastResult = {
  kind: 'gruenstromindex.forecast'
  api: {
    provider: 'gruenstromindex'
    publicApisProject: string
    endpoint: string
    docsUrl: string
    usesBrowserClickstream: false
    authentication: 'none'
    transport: 'HTTPS JSON REST'
    license?: string | undefined
  }
  query: ReturnType<typeof normalizeGruenstromIndexForecastInput>
  count: number
  pagination: {
    returned: number
    limit: number
    maxLimit: number
  }
  forecast: GruenstromIndexForecastEntry[]
  summary: {
    best?: GruenstromIndexForecastEntry | undefined
    worst?: GruenstromIndexForecastEntry | undefined
    averageGsi?: number | undefined
    averageCo2Standard?: number | undefined
    averageCo2Oekostrom?: number | undefined
  }
  location?: GruenstromIndexLocation | undefined
  provisioning?: GruenstromIndexProvisioning | undefined
}

export async function getGruenstromIndexForecast(input: GruenstromIndexForecastInput = {}): Promise<GruenstromIndexForecastResult> {
  const query = normalizeGruenstromIndexForecastInput(input)
  const client = new GruenstromIndexClient()
  const response = await client.getForecast(query)
  const summary = summarizeForecast(response.forecast)
  return {
    kind: 'gruenstromindex.forecast',
    api: {
      provider: 'gruenstromindex',
      publicApisProject: 'https://github.com/public-apis/public-apis',
      endpoint: 'GET /v2.0/gsi/prediction?zip={zip}',
      docsUrl: 'https://corrently.io/books/grunstromindex/page/technische-dokumentation-apisdk',
      usesBrowserClickstream: false,
      authentication: 'none',
      transport: 'HTTPS JSON REST',
      license: response.provisioning?.license,
    },
    query,
    count: response.forecast.length,
    pagination: {
      returned: response.forecast.length,
      limit: query.limit,
      maxLimit: GRUENSTROMINDEX_MAX_LIMIT,
    },
    forecast: response.forecast,
    summary,
    ...(response.location !== undefined ? { location: response.location } : {}),
    ...(response.provisioning !== undefined ? { provisioning: response.provisioning } : {}),
  }
}

function summarizeForecast(forecast: GruenstromIndexForecastEntry[]): GruenstromIndexForecastResult['summary'] {
  const gsiEntries = forecast.filter(entry => typeof entry.gsi === 'number')
  return {
    best: maxBy(gsiEntries, entry => entry.gsi),
    worst: minBy(gsiEntries, entry => entry.gsi),
    averageGsi: average(gsiEntries.map(entry => entry.gsi)),
    averageCo2Standard: average(forecast.map(entry => entry.co2Standard)),
    averageCo2Oekostrom: average(forecast.map(entry => entry.co2Oekostrom)),
  }
}

function average(values: Array<number | undefined>): number | undefined {
  const numbers = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  if (numbers.length === 0) {
    return undefined
  }
  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length
}

function maxBy<T>(values: T[], select: (value: T) => number | undefined): T | undefined {
  return values.reduce<T | undefined>((best, value) => {
    const score = select(value)
    const bestScore = best === undefined ? undefined : select(best)
    return score !== undefined && (bestScore === undefined || score > bestScore) ? value : best
  }, undefined)
}

function minBy<T>(values: T[], select: (value: T) => number | undefined): T | undefined {
  return values.reduce<T | undefined>((best, value) => {
    const score = select(value)
    const bestScore = best === undefined ? undefined : select(best)
    return score !== undefined && (bestScore === undefined || score < bestScore) ? value : best
  }, undefined)
}
