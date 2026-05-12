import {
  NhtsaClient,
  NHTSA_MAKES_MAX_LIMIT,
  normalizeNhtsaDecodeVinInput,
  normalizeNhtsaMakesForTypeInput,
  type NhtsaDecodeVinInput,
  type NhtsaMakeForVehicleType,
  type NhtsaMakesForTypeInput,
  type NhtsaVinDecode,
} from '../../infrastructure/openApis/nhtsaClient.js'

export type NhtsaDecodeVinResult = {
  kind: 'nhtsa.decodeVin'
  api: NhtsaApiMeta
  query: ReturnType<typeof normalizeNhtsaDecodeVinInput>
  count: number
  message: string
  searchCriteria: string
  decode?: NhtsaVinDecode | undefined
}

export type NhtsaMakesForTypeResult = {
  kind: 'nhtsa.makesForType'
  api: NhtsaApiMeta
  query: ReturnType<typeof normalizeNhtsaMakesForTypeInput>
  pagination: {
    returned: number
    upstreamTotal: number
    limit: number
    maxLimit: number
  }
  message: string
  searchCriteria: string
  makes: NhtsaMakeForVehicleType[]
}

type NhtsaApiMeta = {
  provider: 'nhtsa'
  publicApisProject: string
  endpoint: string
  docsUrl: string
  usesBrowserClickstream: false
  authentication: 'none'
  transport: 'HTTPS JSON REST'
  rateControl: string
}

const commonApiMeta = {
  provider: 'nhtsa',
  publicApisProject: 'https://github.com/public-apis/public-apis',
  docsUrl: 'https://vpic.nhtsa.dot.gov/api/',
  usesBrowserClickstream: false,
  authentication: 'none',
  transport: 'HTTPS JSON REST',
  rateControl: 'NHTSA documents automated traffic rate control; use --persist/--offline for repeat queries.',
} satisfies Omit<NhtsaApiMeta, 'endpoint'>

export async function decodeNhtsaVin(input: NhtsaDecodeVinInput = {}): Promise<NhtsaDecodeVinResult> {
  const query = normalizeNhtsaDecodeVinInput(input)
  const client = new NhtsaClient()
  const response = await client.decodeVin(query)
  return {
    kind: 'nhtsa.decodeVin',
    api: {
      ...commonApiMeta,
      endpoint: 'GET /vehicles/DecodeVinValues/{vin}',
    },
    query,
    count: response.count,
    message: response.message,
    searchCriteria: response.searchCriteria,
    decode: response.results[0],
  }
}

export async function getNhtsaMakesForVehicleType(input: NhtsaMakesForTypeInput = {}): Promise<NhtsaMakesForTypeResult> {
  const query = normalizeNhtsaMakesForTypeInput(input)
  const client = new NhtsaClient()
  const response = await client.getMakesForVehicleType(query)
  return {
    kind: 'nhtsa.makesForType',
    api: {
      ...commonApiMeta,
      endpoint: 'GET /vehicles/GetMakesForVehicleType/{vehicleType}',
    },
    query,
    pagination: {
      returned: response.results.length,
      upstreamTotal: response.count,
      limit: query.limit,
      maxLimit: NHTSA_MAKES_MAX_LIMIT,
    },
    message: response.message,
    searchCriteria: response.searchCriteria,
    makes: response.results,
  }
}
