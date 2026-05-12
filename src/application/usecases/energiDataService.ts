import {
  ENERGI_DEFAULT_LIMIT,
  ENERGI_ELSPOT_DEFAULT_PRICE_AREA,
  ENERGI_MAX_LIMIT,
  ENERGI_RIGHT_NOW_DEFAULT_START,
  EnergiDataServiceClient,
  normalizeEnergiElspotPricesInput,
  normalizeEnergiRightNowInput,
  type EnergiElspotPricesInput,
  type EnergiRateLimit,
  type EnergiRightNowInput,
} from '../../infrastructure/openApis/energiDataServiceClient.js'

type EnergiApiMetadata = {
  provider: 'energidataservice'
  endpoint: string
  authentication: 'none'
  usesBrowserClickstream: false
  docs: 'https://www.energidataservice.dk/guides/api-guides'
  homepage: 'https://www.energidataservice.dk/'
  transport: 'HTTPS JSON'
  defaultLimit: number
  limitCap: number
  requestGuidance: 'Maximum 1 request per unique IP address per dataset per minute; live e2e uses one online request per dataset then offline replay.'
  documentedDefaultLimit: '100 when neither start nor limit is provided; limit=0 returns all records and is intentionally not exposed.'
  publicApisProject: 'https://github.com/public-apis/public-apis'
}

export type EnergiRightNowRecord = Record<string, unknown> & {
  Minutes1UTC?: string | undefined
  Minutes1DK?: string | undefined
  CO2Emission?: number | undefined
  ProductionGe100MW?: number | undefined
  ProductionLt100MW?: number | undefined
  SolarPower?: number | undefined
  OffshoreWindPower?: number | undefined
  OnshoreWindPower?: number | undefined
  Exchange_Sum?: number | undefined
}

export type EnergiElspotPriceRecord = Record<string, unknown> & {
  HourUTC?: string | undefined
  HourDK?: string | undefined
  PriceArea?: string | undefined
  SpotPriceDKK?: number | undefined
  SpotPriceEUR?: number | undefined
}

export type EnergiRightNowResult = {
  kind: 'energidataservice.rightnow'
  api: EnergiApiMetadata
  query: ReturnType<typeof normalizeEnergiRightNowInput>
  pagination: {
    total: number
    returned: number
    limit: number
  }
  records: EnergiRightNowRecord[]
  rateLimit: EnergiRateLimit
}

export type EnergiElspotPricesResult = {
  kind: 'energidataservice.elspotprices'
  api: EnergiApiMetadata
  query: ReturnType<typeof normalizeEnergiElspotPricesInput>
  pagination: {
    total: number
    returned: number
    limit: number
  }
  records: EnergiElspotPriceRecord[]
  rateLimit: EnergiRateLimit
}

export async function getEnergiRightNow(input: EnergiRightNowInput = {}): Promise<EnergiRightNowResult> {
  const query = normalizeEnergiRightNowInput(input)
  const client = new EnergiDataServiceClient()
  const data = await client.queryDataset<EnergiRightNowRecord>({
    dataset: 'PowerSystemRightNow',
    start: query.start,
    limit: query.limit,
  })
  return {
    kind: 'energidataservice.rightnow',
    api: createApiMetadata('GET /dataset/PowerSystemRightNow'),
    query,
    pagination: {
      total: data.total,
      returned: data.records.length,
      limit: data.limit,
    },
    records: data.records,
    rateLimit: data.rateLimit,
  }
}

export async function getEnergiElspotPrices(input: EnergiElspotPricesInput = {}): Promise<EnergiElspotPricesResult> {
  const query = normalizeEnergiElspotPricesInput(input)
  const client = new EnergiDataServiceClient()
  const data = await client.queryDataset<EnergiElspotPriceRecord>({
    dataset: 'Elspotprices',
    filter: { PriceArea: [query.priceArea] },
    sort: query.sort,
    limit: query.limit,
    ...(query.start !== undefined ? { start: query.start } : {}),
    ...(query.end !== undefined ? { end: query.end } : {}),
  })
  return {
    kind: 'energidataservice.elspotprices',
    api: createApiMetadata('GET /dataset/Elspotprices'),
    query,
    pagination: {
      total: data.total,
      returned: data.records.length,
      limit: data.limit,
    },
    records: data.records,
    rateLimit: data.rateLimit,
  }
}

function createApiMetadata(endpoint: string): EnergiApiMetadata {
  return {
    provider: 'energidataservice',
    endpoint,
    authentication: 'none',
    usesBrowserClickstream: false,
    docs: 'https://www.energidataservice.dk/guides/api-guides',
    homepage: 'https://www.energidataservice.dk/',
    transport: 'HTTPS JSON',
    defaultLimit: ENERGI_DEFAULT_LIMIT,
    limitCap: ENERGI_MAX_LIMIT,
    requestGuidance: 'Maximum 1 request per unique IP address per dataset per minute; live e2e uses one online request per dataset then offline replay.',
    documentedDefaultLimit: '100 when neither start nor limit is provided; limit=0 returns all records and is intentionally not exposed.',
    publicApisProject: 'https://github.com/public-apis/public-apis',
  }
}

export const ENERGI_RIGHT_NOW_DEFAULTS = {
  start: ENERGI_RIGHT_NOW_DEFAULT_START,
  limit: ENERGI_DEFAULT_LIMIT,
}

export const ENERGI_ELSPOT_DEFAULTS = {
  priceArea: ENERGI_ELSPOT_DEFAULT_PRICE_AREA,
  limit: ENERGI_DEFAULT_LIMIT,
}
