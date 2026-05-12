import {
  normalizeRainViewerMapsInput,
  RainViewerClient,
  RAINVIEWER_MAX_LIMIT,
  type RainViewerFrame,
  type RainViewerMapsInput,
} from '../../infrastructure/openApis/rainViewerClient.js'

export type RainViewerMapsResult = {
  kind: 'rainviewer.maps'
  api: {
    provider: 'rainviewer'
    publicApisProject: string
    endpoint: string
    docsUrl: string
    usesBrowserClickstream: false
    authentication: 'none'
    transport: 'HTTPS JSON REST metadata; PNG tile URLs are returned but not fetched by default'
    rateLimit: string
  }
  query: ReturnType<typeof normalizeRainViewerMapsInput>
  maps: {
    version?: string | undefined
    generated?: number | undefined
    host: string
    radarPast: RainViewerFrame[]
    radarNowcast: RainViewerFrame[]
    satelliteInfrared: RainViewerFrame[]
  }
  pagination: {
    returnedRadarPast: number
    returnedRadarNowcast: number
    returnedSatelliteInfrared: number
    limit: number
    maxLimit: number
  }
}

export async function getRainViewerMaps(input: RainViewerMapsInput = {}): Promise<RainViewerMapsResult> {
  const query = normalizeRainViewerMapsInput(input)
  const client = new RainViewerClient()
  const maps = await client.maps(query)
  return {
    kind: 'rainviewer.maps',
    api: {
      provider: 'rainviewer',
      publicApisProject: 'https://github.com/public-apis/public-apis',
      endpoint: 'GET /public/weather-maps.json',
      docsUrl: 'https://www.rainviewer.com/api/weather-maps-api.html',
      usesBrowserClickstream: false,
      authentication: 'none',
      transport: 'HTTPS JSON REST metadata; PNG tile URLs are returned but not fetched by default',
      rateLimit: 'No API key or public request quota is documented for weather-maps.json; terms limit usage to personal or educational use.',
    },
    query,
    maps,
    pagination: {
      returnedRadarPast: maps.radarPast.length,
      returnedRadarNowcast: maps.radarNowcast.length,
      returnedSatelliteInfrared: maps.satelliteInfrared.length,
      limit: query.limit,
      maxLimit: RAINVIEWER_MAX_LIMIT,
    },
  }
}
