import {
  normalizeOpenSenseMapBoxesInput,
  normalizeOpenSenseMapSensorsInput,
  normalizeOpenSenseMapStatsInput,
  OpenSenseMapClient,
  OPENSENSEMAP_BOXES_MAX_LIMIT,
  OPENSENSEMAP_SENSORS_MAX_COUNT,
  type OpenSenseMapBox,
  type OpenSenseMapBoxesInput,
  type OpenSenseMapSensorsInput,
  type OpenSenseMapStats,
  type OpenSenseMapStatsInput,
} from '../../infrastructure/openApis/openSenseMapClient.js'

export type OpenSenseMapStatsResult = {
  kind: 'opensensemap.stats'
  api: OpenSenseMapApiMeta
  query: ReturnType<typeof normalizeOpenSenseMapStatsInput>
  stats: OpenSenseMapStats
}

export type OpenSenseMapBoxesResult = {
  kind: 'opensensemap.boxes'
  api: OpenSenseMapApiMeta
  query: ReturnType<typeof normalizeOpenSenseMapBoxesInput>
  boxes: OpenSenseMapBox[]
  pagination: {
    returned: number
    limit: number
    maxLimit: number
  }
}

export type OpenSenseMapSensorsResult = {
  kind: 'opensensemap.sensors'
  api: OpenSenseMapApiMeta
  query: ReturnType<typeof normalizeOpenSenseMapSensorsInput>
  box: OpenSenseMapBox
  pagination: {
    sensors: number
    count: number
    maxCount: number
  }
}

type OpenSenseMapApiMeta = {
  provider: 'opensensemap'
  publicApisProject: string
  endpoint: string
  docsUrl: string
  usesBrowserClickstream: false
  authentication: 'none'
  transport: 'HTTPS JSON REST'
  rateLimit: string
}

const commonApiMeta = {
  provider: 'opensensemap',
  publicApisProject: 'https://github.com/public-apis/public-apis',
  docsUrl: 'https://docs.opensensemap.org/',
  usesBrowserClickstream: false,
  authentication: 'none',
  transport: 'HTTPS JSON REST',
  rateLimit: 'No public rate limit is documented for these read-only openSenseMap GET routes.',
} satisfies Omit<OpenSenseMapApiMeta, 'endpoint'>

export async function getOpenSenseMapStats(input: OpenSenseMapStatsInput = {}): Promise<OpenSenseMapStatsResult> {
  const query = normalizeOpenSenseMapStatsInput(input)
  const client = new OpenSenseMapClient()
  return {
    kind: 'opensensemap.stats',
    api: { ...commonApiMeta, endpoint: 'GET /stats' },
    query,
    stats: await client.stats(query),
  }
}

export async function listOpenSenseMapBoxes(input: OpenSenseMapBoxesInput = {}): Promise<OpenSenseMapBoxesResult> {
  const query = normalizeOpenSenseMapBoxesInput(input)
  const client = new OpenSenseMapClient()
  const boxes = await client.boxes(query)
  return {
    kind: 'opensensemap.boxes',
    api: { ...commonApiMeta, endpoint: 'GET /boxes' },
    query,
    boxes,
    pagination: {
      returned: boxes.length,
      limit: query.limit,
      maxLimit: OPENSENSEMAP_BOXES_MAX_LIMIT,
    },
  }
}

export async function getOpenSenseMapSensors(input: OpenSenseMapSensorsInput = {}): Promise<OpenSenseMapSensorsResult> {
  const query = normalizeOpenSenseMapSensorsInput(input)
  const client = new OpenSenseMapClient()
  const box = await client.sensors(query)
  return {
    kind: 'opensensemap.sensors',
    api: { ...commonApiMeta, endpoint: 'GET /boxes/{boxId}/sensors' },
    query,
    box,
    pagination: {
      sensors: box.sensors.length,
      count: query.count,
      maxCount: OPENSENSEMAP_SENSORS_MAX_COUNT,
    },
  }
}
