import {
  DucksUnlimitedClient,
  DUCKS_UNLIMITED_MAX_LIMIT,
  normalizeDucksUnlimitedChaptersInput,
  type DucksUnlimitedChapter,
  type DucksUnlimitedChaptersInput,
} from '../../infrastructure/openApis/ducksUnlimitedClient.js'

export type DucksUnlimitedChaptersResult = {
  kind: 'ducksunlimited.chapters'
  api: {
    providerId: 'ducksunlimited'
    providerName: 'Ducks Unlimited'
    endpoint: 'GET /FeatureServer/0/query'
    documentation: 'https://gis.ducks.org/datasets/du-university-chapters/api'
    authentication: 'none'
    usesBrowserClickstream: false
    transport: 'HTTPS JSON REST'
    platform: 'ArcGIS Hub / FeatureServer'
    license: 'Creative Commons Attribution-NonCommercial 4.0 International'
    limitPolicy: 'ArcGIS service maxRecordCount is 1000; CLI caps single requests at 100 rows for readable output and cache size.'
  }
  query: ReturnType<typeof normalizeDucksUnlimitedChaptersInput>
  pagination: {
    returned: number
    limit: number
    maxLimit: typeof DUCKS_UNLIMITED_MAX_LIMIT
    exceededTransferLimit: boolean
  }
  chapters: DucksUnlimitedChapter[]
}

export async function listDucksUnlimitedChapters(input: DucksUnlimitedChaptersInput = {}): Promise<DucksUnlimitedChaptersResult> {
  const query = normalizeDucksUnlimitedChaptersInput(input)
  const response = await new DucksUnlimitedClient().listChapters(query)
  return {
    kind: 'ducksunlimited.chapters',
    api: {
      providerId: 'ducksunlimited',
      providerName: 'Ducks Unlimited',
      endpoint: 'GET /FeatureServer/0/query',
      documentation: 'https://gis.ducks.org/datasets/du-university-chapters/api',
      authentication: 'none',
      usesBrowserClickstream: false,
      transport: 'HTTPS JSON REST',
      platform: 'ArcGIS Hub / FeatureServer',
      license: 'Creative Commons Attribution-NonCommercial 4.0 International',
      limitPolicy: 'ArcGIS service maxRecordCount is 1000; CLI caps single requests at 100 rows for readable output and cache size.',
    },
    query,
    pagination: {
      returned: response.chapters.length,
      limit: query.limit,
      maxLimit: DUCKS_UNLIMITED_MAX_LIMIT,
      exceededTransferLimit: response.exceededTransferLimit,
    },
    chapters: response.chapters,
  }
}

export type { DucksUnlimitedChaptersInput }
