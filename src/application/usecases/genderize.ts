import {
  GENDERIZE_DEFAULT_NAME,
  GenderizeClient,
  normalizeGenderizeQuery,
  type GenderizeRateLimit,
} from '../../infrastructure/openApis/genderizeClient.js'

export type GenderizePredictInput = {
  name?: string | undefined
  countryId?: string | undefined
}

export type GenderizePredictResult = {
  kind: 'genderize.predict'
  api: {
    provider: 'genderize'
    endpoint: 'GET /?name={name}'
    authentication: 'none'
    usesBrowserClickstream: false
    docs: 'https://genderize.io/'
    freeRateLimit: '100 requests/day for unauthenticated usage; API key plans are documented separately.'
    defaultName: string
    batchSupport: 'documented but intentionally not exposed in CLI to preserve free quota'
  }
  query: {
    name: string
    countryId?: string | undefined
  }
  prediction: {
    name: string
    gender: 'male' | 'female' | null
    probability: number
    count: number
    countryId?: string | undefined
  }
  rateLimit: GenderizeRateLimit
}

export async function predictGenderize(input: GenderizePredictInput = {}): Promise<GenderizePredictResult> {
  const query = normalizeGenderizeQuery(input)
  const client = new GenderizeClient()
  const prediction = await client.predict(query)

  return {
    kind: 'genderize.predict',
    api: {
      provider: 'genderize',
      endpoint: 'GET /?name={name}',
      authentication: 'none',
      usesBrowserClickstream: false,
      docs: 'https://genderize.io/',
      freeRateLimit: '100 requests/day for unauthenticated usage; API key plans are documented separately.',
      defaultName: GENDERIZE_DEFAULT_NAME,
      batchSupport: 'documented but intentionally not exposed in CLI to preserve free quota',
    },
    query,
    prediction: {
      name: prediction.name,
      gender: prediction.gender,
      probability: prediction.probability,
      count: prediction.count,
      ...(prediction.countryId !== undefined ? { countryId: prediction.countryId } : {}),
    },
    rateLimit: prediction.rateLimit,
  }
}
