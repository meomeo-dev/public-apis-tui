import {
  VELIB_MAX_LIMIT,
  VelibClient,
  normalizeVelibStationsInput,
  type VelibStation,
  type VelibStationsInput,
} from '../../infrastructure/openApis/velibClient.js'

const docsUrl = 'https://www.velib-metropole.fr/donnees-open-data-gbfs-du-service-velib-metropole'

export type VelibStationsResult = {
  kind: 'velib.stations'
  api: {
    provider: 'velib'
    endpoint: string
    authentication: 'none'
    usesBrowserClickstream: false
    docsUrl: string
    standard: string
    limitPolicy: string
  }
  query: ReturnType<typeof normalizeVelibStationsInput>
  stations: VelibStation[]
  count: number
  totalStations: number
  snapshot: {
    informationLastUpdated?: number | undefined
    statusLastUpdated?: number | undefined
    ttl?: number | undefined
  }
}

export async function listVelibStations(input: VelibStationsInput = {}): Promise<VelibStationsResult> {
  const query = normalizeVelibStationsInput(input)
  const response = await new VelibClient().stations(query)
  return {
    kind: 'velib.stations',
    api: {
      provider: 'velib',
      endpoint: 'GET GBFS station_information.json + station_status.json',
      authentication: 'none',
      usesBrowserClickstream: false,
      docsUrl,
      standard: 'GBFS station_information and station_status feeds',
      limitPolicy: `Feeds are full snapshots; CLI filters locally and caps terminal output at ${VELIB_MAX_LIMIT}.`,
    },
    query,
    stations: response.stations,
    count: response.stations.length,
    totalStations: response.totalStations,
    snapshot: {
      informationLastUpdated: response.informationLastUpdated,
      statusLastUpdated: response.statusLastUpdated,
      ttl: response.ttl,
    },
  }
}

export type { VelibStation, VelibStationsInput }
