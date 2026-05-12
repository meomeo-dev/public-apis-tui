import {
  AGIFY_DEFAULT_NAME,
  AgifyClient,
  normalizeAgifyQuery,
  type AgifyRateLimit,
} from '../../infrastructure/openApis/agifyClient.js'

export type AgifyAgeInput = {
  name?: string | undefined
  countryId?: string | undefined
}

export type AgifyAgeResult = {
  kind: 'agify.age'
  api: {
    provider: 'agify'
    endpoint: 'GET /?name={name}'
    authentication: 'none'
    usesBrowserClickstream: false
    docs: 'https://agify.io/'
    freeRateLimit: '100 requests/day for unauthenticated usage; API key plans are documented separately.'
    defaultName: string
  }
  query: {
    name: string
    countryId?: string | undefined
  }
  prediction: {
    name: string
    age: number | null
    count: number
    countryId?: string | undefined
  }
  rateLimit: AgifyRateLimit
}

export async function predictAgifyAge(input: AgifyAgeInput = {}): Promise<AgifyAgeResult> {
  const query = normalizeAgifyQuery(input)
  const client = new AgifyClient()
  const prediction = await client.predict(query)
  return {
    kind: 'agify.age',
    api: {
      provider: 'agify',
      endpoint: 'GET /?name={name}',
      authentication: 'none',
      usesBrowserClickstream: false,
      docs: 'https://agify.io/',
      freeRateLimit: '100 requests/day for unauthenticated usage; API key plans are documented separately.',
      defaultName: AGIFY_DEFAULT_NAME,
    },
    query,
    prediction: {
      name: prediction.name,
      age: prediction.age,
      count: prediction.count,
      ...(prediction.countryId !== undefined ? { countryId: prediction.countryId } : {}),
    },
    rateLimit: prediction.rateLimit,
  }
}
