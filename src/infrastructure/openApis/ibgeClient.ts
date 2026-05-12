import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const IBGE_BASE_URL = 'https://servicodados.ibge.gov.br'
export const IBGE_DEFAULT_STATE = 'SP'
export const IBGE_DEFAULT_LIMIT = 30
export const IBGE_MAX_LIMIT = 100

export type IbgeStatesInput = {
  limit?: number | undefined
}

export type IbgeMunicipalitiesInput = {
  state?: string | undefined
  limit?: number | undefined
}

export type NormalizedIbgeStatesInput = {
  limit: number
}

export type NormalizedIbgeMunicipalitiesInput = {
  state: string
  limit: number
}

export type IbgeRegion = {
  id: number
  acronym: string
  name: string
}

export type IbgeState = {
  id: number
  acronym: string
  name: string
  region?: IbgeRegion | undefined
}

export type IbgeMunicipality = {
  id: number
  name: string
  state?: IbgeState | undefined
  immediateRegion?: string | undefined
  intermediateRegion?: string | undefined
}

export class IbgeClient {
  constructor(private readonly options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {}

  async listStates(input: NormalizedIbgeStatesInput): Promise<{ states: IbgeState[]; totalReturned: number }> {
    const url = new URL('/api/v1/localidades/estados', this.options.baseUrl ?? IBGE_BASE_URL)
    url.searchParams.set('orderBy', 'nome')
    const parsed = await this.fetchJson(url)
    if (!Array.isArray(parsed)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'IBGE states response had an unexpected schema.', { response: parsed })
    }
    const states = parsed.filter(isRecord).map(parseState).filter((state): state is IbgeState => state !== undefined)
    return { states: states.slice(0, input.limit), totalReturned: states.length }
  }

  async listMunicipalities(input: NormalizedIbgeMunicipalitiesInput): Promise<{ municipalities: IbgeMunicipality[]; totalReturned: number }> {
    const url = new URL(`/api/v1/localidades/estados/${encodeURIComponent(input.state)}/municipios`, this.options.baseUrl ?? IBGE_BASE_URL)
    url.searchParams.set('orderBy', 'nome')
    const parsed = await this.fetchJson(url)
    if (!Array.isArray(parsed)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'IBGE municipalities response had an unexpected schema.', { response: parsed })
    }
    const municipalities = parsed.filter(isRecord).map(parseMunicipality).filter((municipality): municipality is IbgeMunicipality => municipality !== undefined)
    return { municipalities: municipalities.slice(0, input.limit), totalReturned: municipalities.length }
  }

  private async fetchJson(url: URL): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `IBGE request failed: ${String(error)}`, {
        provider: 'ibge',
        endpoint: url.href,
      })
    }

    let body: string
    try {
      body = await response.text()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `IBGE response body could not be read: ${String(error)}`, {
        provider: 'ibge',
        status: response.status,
        endpoint: url.href,
      })
    }

    if (isCloudflareChallenge(response, body)) {
      throw new RuntimeFailure('OPEN_API_FAILED', 'IBGE is currently returning a Cloudflare challenge HTML page instead of the documented JSON API response; retry later or use cached/offline data.', {
        provider: 'ibge',
        status: response.status,
        endpoint: url.href,
      })
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(body)
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `IBGE returned a non-JSON response: ${String(error)}`, {
        provider: 'ibge',
        status: response.status,
        endpoint: url.href,
        contentType: response.headers.get('content-type') ?? undefined,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', `IBGE request failed with HTTP ${response.status}.`, {
        provider: 'ibge',
        status: response.status,
        endpoint: url.href,
        response: parsed,
      })
    }

    return parsed
  }
}

export function normalizeIbgeStatesInput(input: IbgeStatesInput = {}): NormalizedIbgeStatesInput {
  return { limit: normalizeLimit(input.limit ?? IBGE_DEFAULT_LIMIT) }
}

export function normalizeIbgeMunicipalitiesInput(input: IbgeMunicipalitiesInput = {}): NormalizedIbgeMunicipalitiesInput {
  const state = (input.state ?? IBGE_DEFAULT_STATE).trim().toUpperCase()
  if (!/^[A-Z]{2}$/u.test(state)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--state must be a two-letter Brazilian state abbreviation such as SP, RJ, or BA.')
  }
  return { state, limit: normalizeLimit(input.limit ?? IBGE_DEFAULT_LIMIT) }
}

function parseState(value: Record<string, unknown>): IbgeState | undefined {
  const id = parseInteger(value.id)
  const acronym = optionalString(value.sigla)
  const name = optionalString(value.nome)
  if (id === undefined || acronym === undefined || name === undefined) return undefined
  const region = isRecord(value.regiao) ? parseRegion(value.regiao) : undefined
  return { id, acronym, name, ...(region !== undefined ? { region } : {}) }
}

function parseRegion(value: Record<string, unknown>): IbgeRegion | undefined {
  const id = parseInteger(value.id)
  const acronym = optionalString(value.sigla)
  const name = optionalString(value.nome)
  if (id === undefined || acronym === undefined || name === undefined) return undefined
  return { id, acronym, name }
}

function parseMunicipality(value: Record<string, unknown>): IbgeMunicipality | undefined {
  const id = parseInteger(value.id)
  const name = optionalString(value.nome)
  if (id === undefined || name === undefined) return undefined
  const microregion = isRecord(value.microrregiao) ? value.microrregiao : {}
  const mesoregion = isRecord(microregion.mesorregiao) ? microregion.mesorregiao : {}
  const legacyState = isRecord(mesoregion.UF) ? parseState(mesoregion.UF) : undefined
  const immediate = isRecord(value['regiao-imediata']) ? value['regiao-imediata'] : {}
  const intermediate = isRecord(immediate['regiao-intermediaria']) ? immediate['regiao-intermediaria'] : {}
  const immediateState = isRecord(intermediate.UF) ? parseState(intermediate.UF) : undefined
  return {
    id,
    name,
    state: immediateState ?? legacyState,
    immediateRegion: optionalString(immediate.nome),
    intermediateRegion: optionalString(intermediate.nome),
  }
}

function normalizeLimit(value: number): number {
  if (!Number.isInteger(value) || value < 1 || value > IBGE_MAX_LIMIT) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `--limit must be an integer between 1 and ${String(IBGE_MAX_LIMIT)}.`)
  }
  return value
}

function parseInteger(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isInteger(value)) return value
  if (typeof value !== 'string' || value.trim() === '') return undefined
  const number = Number(value)
  return Number.isInteger(number) ? number : undefined
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

function isCloudflareChallenge(response: Response, body: string): boolean {
  const server = response.headers.get('server')?.toLowerCase()
  const mitigated = response.headers.get('cf-mitigated')?.toLowerCase()
  return response.status === 403 && (mitigated === 'challenge' || server === 'cloudflare' || body.includes('Just a moment...'))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
