import {
  LUCHTMEETNET_COMPONENTS_MAX_LIMIT,
  LUCHTMEETNET_CONCENTRATIONS_MAX_LIMIT,
  LUCHTMEETNET_MEASUREMENTS_MAX_LIMIT,
  LuchtmeetnetClient,
  normalizeLuchtmeetnetComponentsInput,
  normalizeLuchtmeetnetConcentrationsInput,
  normalizeLuchtmeetnetMeasurementsInput,
  type LuchtmeetnetComponent,
  type LuchtmeetnetComponentsInput,
  type LuchtmeetnetConcentrationsInput,
  type LuchtmeetnetMeasurement,
  type LuchtmeetnetMeasurementsInput,
  type LuchtmeetnetPagination,
} from '../../infrastructure/openApis/luchtmeetnetClient.js'

type LuchtmeetnetApiMeta = {
  provider: 'luchtmeetnet'
  publicApisProject: string
  endpoint: string
  docsUrl: string
  usesBrowserClickstream: false
  authentication: 'none'
  transport: 'HTTPS JSON REST'
}

type LuchtmeetnetPageMeta = {
  returned: number
  limit: number
  maxLimit: number
  sourcePagination?: LuchtmeetnetPagination | undefined
}

export type LuchtmeetnetComponentsResult = {
  kind: 'luchtmeetnet.components'
  api: LuchtmeetnetApiMeta
  query: ReturnType<typeof normalizeLuchtmeetnetComponentsInput>
  count: number
  pagination: LuchtmeetnetPageMeta
  components: LuchtmeetnetComponent[]
}

export type LuchtmeetnetMeasurementsResult = {
  kind: 'luchtmeetnet.measurements'
  api: LuchtmeetnetApiMeta
  query: ReturnType<typeof normalizeLuchtmeetnetMeasurementsInput>
  count: number
  pagination: LuchtmeetnetPageMeta
  measurements: LuchtmeetnetMeasurement[]
  summary: MeasurementSummary
}

export type LuchtmeetnetConcentrationsResult = {
  kind: 'luchtmeetnet.concentrations'
  api: LuchtmeetnetApiMeta
  query: ReturnType<typeof normalizeLuchtmeetnetConcentrationsInput>
  count: number
  pagination: LuchtmeetnetPageMeta
  concentrations: LuchtmeetnetMeasurement[]
  summary: MeasurementSummary
}

type MeasurementSummary = {
  latest?: LuchtmeetnetMeasurement | undefined
  min?: number | undefined
  max?: number | undefined
  average?: number | undefined
}

export async function listLuchtmeetnetComponents(input: LuchtmeetnetComponentsInput = {}): Promise<LuchtmeetnetComponentsResult> {
  const query = normalizeLuchtmeetnetComponentsInput(input)
  const client = new LuchtmeetnetClient()
  const response = await client.listComponents(query)
  return {
    kind: 'luchtmeetnet.components',
    api: createApiMeta('GET /open_api/components'),
    query,
    count: response.data.length,
    pagination: createPageMeta(response.data.length, query.limit, LUCHTMEETNET_COMPONENTS_MAX_LIMIT, response.pagination),
    components: response.data,
  }
}

export async function listLuchtmeetnetMeasurements(input: LuchtmeetnetMeasurementsInput = {}): Promise<LuchtmeetnetMeasurementsResult> {
  const query = normalizeLuchtmeetnetMeasurementsInput(input)
  const client = new LuchtmeetnetClient()
  const response = await client.listMeasurements(query)
  return {
    kind: 'luchtmeetnet.measurements',
    api: createApiMeta('GET /open_api/measurements'),
    query,
    count: response.data.length,
    pagination: createPageMeta(response.data.length, query.limit, LUCHTMEETNET_MEASUREMENTS_MAX_LIMIT, response.pagination),
    measurements: response.data,
    summary: summarizeMeasurements(response.data),
  }
}

export async function listLuchtmeetnetConcentrations(input: LuchtmeetnetConcentrationsInput = {}): Promise<LuchtmeetnetConcentrationsResult> {
  const query = normalizeLuchtmeetnetConcentrationsInput(input)
  const client = new LuchtmeetnetClient()
  const response = await client.listConcentrations(query)
  return {
    kind: 'luchtmeetnet.concentrations',
    api: createApiMeta('GET /open_api/concentrations'),
    query,
    count: response.data.length,
    pagination: createPageMeta(response.data.length, query.limit, LUCHTMEETNET_CONCENTRATIONS_MAX_LIMIT, response.pagination),
    concentrations: response.data,
    summary: summarizeMeasurements(response.data),
  }
}

function createApiMeta(endpoint: string): LuchtmeetnetApiMeta {
  return {
    provider: 'luchtmeetnet',
    publicApisProject: 'https://github.com/public-apis/public-apis',
    endpoint,
    docsUrl: 'https://api-docs.luchtmeetnet.nl/',
    usesBrowserClickstream: false,
    authentication: 'none',
    transport: 'HTTPS JSON REST',
  }
}

function createPageMeta(returned: number, limit: number, maxLimit: number, sourcePagination?: LuchtmeetnetPagination | undefined): LuchtmeetnetPageMeta {
  return {
    returned,
    limit,
    maxLimit,
    ...(sourcePagination !== undefined ? { sourcePagination } : {}),
  }
}

function summarizeMeasurements(values: LuchtmeetnetMeasurement[]): MeasurementSummary {
  const numbers = values.map(entry => entry.value).filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  return {
    latest: values[0],
    min: numbers.length === 0 ? undefined : Math.min(...numbers),
    max: numbers.length === 0 ? undefined : Math.max(...numbers),
    average: numbers.length === 0 ? undefined : numbers.reduce((sum, value) => sum + value, 0) / numbers.length,
  }
}
