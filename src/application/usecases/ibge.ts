import {
  IBGE_DEFAULT_LIMIT,
  IBGE_DEFAULT_STATE,
  IBGE_MAX_LIMIT,
  IbgeClient,
  normalizeIbgeMunicipalitiesInput,
  normalizeIbgeStatesInput,
  type IbgeMunicipalitiesInput,
  type IbgeMunicipality,
  type IbgeState,
  type IbgeStatesInput,
} from '../../infrastructure/openApis/ibgeClient.js'

type IbgeApiMeta = {
  providerId: 'ibge'
  providerName: 'IBGE'
  endpoint: 'GET /api/v1/localidades/estados' | 'GET /api/v1/localidades/estados/{state}/municipios'
  documentation: 'https://servicodados.ibge.gov.br/api/docs/localidades'
  authentication: 'none'
  usesBrowserClickstream: false
  transport: 'HTTPS JSON REST'
  rateLimitPolicy: 'No official numeric rate limit found for Localidades; use persistence for repeated lookups.'
  cliLimitCap: typeof IBGE_MAX_LIMIT
}

const baseApi = {
  providerId: 'ibge',
  providerName: 'IBGE',
  documentation: 'https://servicodados.ibge.gov.br/api/docs/localidades',
  authentication: 'none',
  usesBrowserClickstream: false,
  transport: 'HTTPS JSON REST',
  rateLimitPolicy: 'No official numeric rate limit found for Localidades; use persistence for repeated lookups.',
  cliLimitCap: IBGE_MAX_LIMIT,
} satisfies Omit<IbgeApiMeta, 'endpoint'>

export type IbgeStatesResult = {
  kind: 'ibge.states'
  api: IbgeApiMeta
  query: ReturnType<typeof normalizeIbgeStatesInput>
  count: number
  totalReturned: number
  states: IbgeState[]
}

export type IbgeMunicipalitiesResult = {
  kind: 'ibge.municipalities'
  api: IbgeApiMeta
  query: ReturnType<typeof normalizeIbgeMunicipalitiesInput>
  count: number
  totalReturned: number
  municipalities: IbgeMunicipality[]
}

export async function listIbgeStates(input: IbgeStatesInput = {}): Promise<IbgeStatesResult> {
  const query = normalizeIbgeStatesInput(input)
  const { states, totalReturned } = await new IbgeClient().listStates(query)
  return {
    kind: 'ibge.states',
    api: { ...baseApi, endpoint: 'GET /api/v1/localidades/estados' },
    query,
    count: states.length,
    totalReturned,
    states,
  }
}

export async function listIbgeMunicipalities(input: IbgeMunicipalitiesInput = {}): Promise<IbgeMunicipalitiesResult> {
  const query = normalizeIbgeMunicipalitiesInput(input)
  const { municipalities, totalReturned } = await new IbgeClient().listMunicipalities(query)
  return {
    kind: 'ibge.municipalities',
    api: { ...baseApi, endpoint: 'GET /api/v1/localidades/estados/{state}/municipios' },
    query,
    count: municipalities.length,
    totalReturned,
    municipalities,
  }
}

export { IBGE_DEFAULT_LIMIT, IBGE_DEFAULT_STATE, IBGE_MAX_LIMIT }
export type { IbgeMunicipalitiesInput, IbgeStatesInput }
