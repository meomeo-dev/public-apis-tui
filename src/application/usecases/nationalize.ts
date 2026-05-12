import {
  NATIONALIZE_DEFAULT_NAME,
  NationalizeClient,
  normalizeNationalizeQuery,
  type NationalizeCountryPrediction,
  type NationalizeRateLimit,
} from '../../infrastructure/openApis/nationalizeClient.js'

export type NationalizePredictInput = {
  name?: string | undefined
}

export type NationalizePredictResult = {
  kind: 'nationalize.predict'
  api: {
    provider: 'nationalize'
    endpoint: 'GET /?name={name}'
    authentication: 'none'
    usesBrowserClickstream: false
    docs: 'https://nationalize.io'
    homepage: 'https://nationalize.io'
    transport: 'HTTPS JSON'
    freeRateLimit: '2,500 names/month free plan; live headers expose 100 request window'
    batchSupport: 'documented/live-supported but intentionally not exposed in CLI to preserve free quota'
    publicApisProject: 'https://github.com/public-apis/public-apis'
  }
  query: {
    name: string
  }
  prediction: {
    name: string
    count: number
    countries: NationalizeCountryPrediction[]
    topCountry?: NationalizeCountryPrediction | undefined
  }
  rateLimit: NationalizeRateLimit
}

export async function predictNationalize(input: NationalizePredictInput = {}): Promise<NationalizePredictResult> {
  const query = normalizeNationalizeQuery(input)
  const client = new NationalizeClient()
  const prediction = await client.predict(query)
  return {
    kind: 'nationalize.predict',
    api: {
      provider: 'nationalize',
      endpoint: 'GET /?name={name}',
      authentication: 'none',
      usesBrowserClickstream: false,
      docs: 'https://nationalize.io',
      homepage: 'https://nationalize.io',
      transport: 'HTTPS JSON',
      freeRateLimit: '2,500 names/month free plan; live headers expose 100 request window',
      batchSupport: 'documented/live-supported but intentionally not exposed in CLI to preserve free quota',
      publicApisProject: 'https://github.com/public-apis/public-apis',
    },
    query,
    prediction: {
      name: prediction.name,
      count: prediction.count,
      countries: prediction.countries,
      ...(prediction.countries[0] !== undefined ? { topCountry: prediction.countries[0] } : {}),
    },
    rateLimit: prediction.rateLimit,
  }
}

export function createDefaultNationalizeInput(): NationalizePredictInput {
  return { name: NATIONALIZE_DEFAULT_NAME }
}
