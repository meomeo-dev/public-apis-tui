import {
  normalizeUkPoliceStreetCrimesInput,
  UkPoliceClient,
  UK_POLICE_MAX_LIMIT,
  type UkPoliceStreetCrime,
  type UkPoliceStreetCrimesInput,
} from '../../infrastructure/openApis/ukPoliceClient.js'

type UkPoliceApiMeta = {
  provider: 'ukpolice'
  publicApisProject: string
  endpoint: string
  docsUrl: string
  usesBrowserClickstream: false
  authentication: 'none'
  transport: 'HTTPS JSON REST'
  platform: 'data.police.uk API'
  safety: string
  limitPolicy: string
}

export type UkPoliceStreetCrimesResult = {
  kind: 'ukpolice.streetCrimes'
  api: UkPoliceApiMeta
  query: ReturnType<typeof normalizeUkPoliceStreetCrimesInput>
  count: number
  pagination: {
    returned: number
    totalAvailable: number
    truncated: boolean
    limit: number
    maxLimit: number
  }
  latestKnownDate?: string | undefined
  crimes: UkPoliceStreetCrime[]
}

export async function listUkPoliceStreetCrimes(input: UkPoliceStreetCrimesInput = {}): Promise<UkPoliceStreetCrimesResult> {
  const query = normalizeUkPoliceStreetCrimesInput(input)
  const client = new UkPoliceClient()
  const response = await client.listStreetCrimes(query)
  return {
    kind: 'ukpolice.streetCrimes',
    api: {
      provider: 'ukpolice',
      publicApisProject: 'https://github.com/public-apis/public-apis',
      endpoint: response.meta.sourceEndpoint,
      docsUrl: 'https://data.police.uk/docs/',
      usesBrowserClickstream: false,
      authentication: 'none',
      transport: 'HTTPS JSON REST',
      platform: 'data.police.uk API',
      safety: 'Read-only public street-level crime records only; no incident reporting, police contact workflows, free-form polygons, stop-and-search, or person lookup surfaces are exposed.',
      limitPolicy: 'Street-crime responses can be large; CLI requires explicit coordinates, applies a default category and caps terminal/cache output at 100 rows.',
    },
    query,
    count: response.crimes.length,
    pagination: {
      returned: response.meta.returned,
      totalAvailable: response.meta.totalAvailable,
      truncated: response.meta.truncated,
      limit: query.limit,
      maxLimit: UK_POLICE_MAX_LIMIT,
    },
    latestKnownDate: response.meta.latestKnownDate,
    crimes: response.crimes,
  }
}
