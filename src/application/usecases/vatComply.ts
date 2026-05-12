import {
  VatComplyClient,
  VATCOMPLY_RATES_MAX_LIMIT,
  VATCOMPLY_VAT_RATES_MAX_LIMIT,
  normalizeVatComplyRatesInput,
  normalizeVatComplyVatInput,
  normalizeVatComplyVatRatesInput,
  type VatComplyLocation,
  type VatComplyRate,
  type VatComplyRatesInput,
  type VatComplyVatInput,
  type VatComplyVatRate,
  type VatComplyVatRatesInput,
  type VatComplyVatValidation,
} from '../../infrastructure/openApis/vatComplyClient.js'

type VatComplyApiMetadata = {
  provider: 'vatcomply'
  publicApisProject: string
  endpoint: string
  docsUrl: string
  usesBrowserClickstream: false
  authentication: 'none'
  transport: 'HTTPS JSON REST'
  rateLimit: string
}

export type VatComplyRatesResult = {
  kind: 'vatcomply.rates'
  api: VatComplyApiMetadata
  query: ReturnType<typeof normalizeVatComplyRatesInput>
  date: string
  base: string
  rates: VatComplyRate[]
  pagination: { returned: number; limit: number; maxLimit: number }
}

export type VatComplyVatRatesResult = {
  kind: 'vatcomply.vatRates'
  api: VatComplyApiMetadata
  query: ReturnType<typeof normalizeVatComplyVatRatesInput>
  rates: VatComplyVatRate[]
  pagination: { returned: number; limit: number; maxLimit: number }
}

export type VatComplyGeolocateResult = {
  kind: 'vatcomply.geolocate'
  api: VatComplyApiMetadata
  query: Record<string, never>
  location: VatComplyLocation
}

export type VatComplyVatResult = {
  kind: 'vatcomply.vat'
  api: VatComplyApiMetadata
  query: ReturnType<typeof normalizeVatComplyVatInput>
  validation: VatComplyVatValidation
}

export async function getVatComplyRates(input: VatComplyRatesInput = {}): Promise<VatComplyRatesResult> {
  const query = normalizeVatComplyRatesInput(input)
  const result = await new VatComplyClient().rates(query)
  return {
    kind: 'vatcomply.rates',
    api: createApiMetadata('GET /rates'),
    query,
    date: result.date,
    base: result.base,
    rates: result.rates,
    pagination: { returned: result.rates.length, limit: query.limit, maxLimit: VATCOMPLY_RATES_MAX_LIMIT },
  }
}

export async function listVatComplyVatRates(input: VatComplyVatRatesInput = {}): Promise<VatComplyVatRatesResult> {
  const query = normalizeVatComplyVatRatesInput(input)
  const rates = await new VatComplyClient().vatRates(query)
  return {
    kind: 'vatcomply.vatRates',
    api: createApiMetadata('GET /vat_rates'),
    query,
    rates,
    pagination: { returned: rates.length, limit: query.limit, maxLimit: VATCOMPLY_VAT_RATES_MAX_LIMIT },
  }
}

export async function geolocateVatComply(): Promise<VatComplyGeolocateResult> {
  return {
    kind: 'vatcomply.geolocate',
    api: createApiMetadata('GET /geolocate'),
    query: {},
    location: await new VatComplyClient().geolocate(),
  }
}

export async function validateVatComplyVat(input: VatComplyVatInput = {}): Promise<VatComplyVatResult> {
  const query = normalizeVatComplyVatInput(input)
  return {
    kind: 'vatcomply.vat',
    api: createApiMetadata('GET /vat'),
    query,
    validation: await new VatComplyClient().vat(query),
  }
}

function createApiMetadata(endpoint: string): VatComplyApiMetadata {
  return {
    provider: 'vatcomply',
    publicApisProject: 'https://github.com/public-apis/public-apis',
    endpoint,
    docsUrl: 'https://api.vatcomply.com/docs',
    usesBrowserClickstream: false,
    authentication: 'none',
    transport: 'HTTPS JSON REST',
    rateLimit: 'The current OpenAPI document publishes no security scheme, API key, OAuth flow, or public request quota for selected endpoints.',
  }
}

export type { VatComplyRatesInput, VatComplyVatInput, VatComplyVatRatesInput }
