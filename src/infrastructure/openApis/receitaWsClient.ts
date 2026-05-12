import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const RECEITA_WS_DEFAULT_CNPJ = '27865757000102'

type FetchImpl = typeof fetch

export type ReceitaWsLookupInput = {
  cnpj?: string | undefined
}

export type NormalizedReceitaWsLookupInput = {
  cnpj: string
}

export type ReceitaWsActivity = {
  code: string
  text: string
}

export type ReceitaWsCompany = {
  cnpj: string
  status: string
  name?: string | undefined
  alias?: string | undefined
  openingDate?: string | undefined
  situation?: string | undefined
  type?: string | undefined
  size?: string | undefined
  legalNature?: string | undefined
  primaryActivities: ReceitaWsActivity[]
  secondaryActivities: ReceitaWsActivity[]
  street?: string | undefined
  number?: string | undefined
  complement?: string | undefined
  district?: string | undefined
  city?: string | undefined
  state?: string | undefined
  zip?: string | undefined
  email?: string | undefined
  phone?: string | undefined
  shareCapital?: string | undefined
  updatedAt?: string | undefined
}

export class ReceitaWsClient {
  constructor(private readonly options: { fetchImpl?: FetchImpl | undefined; baseUrl?: string | undefined } = {}) {}

  async lookup(input: NormalizedReceitaWsLookupInput): Promise<ReceitaWsCompany> {
    const url = new URL(`/v1/cnpj/${input.cnpj}`, this.options.baseUrl ?? 'https://www.receitaws.com.br')
    const fetchImpl = this.options.fetchImpl ?? fetch
    const response = await fetchImpl(url, { headers: { accept: 'application/json' } })
    const parsed = await readJson(response)
    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', `ReceitaWS request failed with HTTP ${response.status}.`, {
        status: response.status,
        message: readApiMessage(parsed),
      })
    }
    return parseCompany(parsed)
  }
}

export function normalizeReceitaWsLookupInput(input: ReceitaWsLookupInput = {}): NormalizedReceitaWsLookupInput {
  const cnpj = (input.cnpj ?? RECEITA_WS_DEFAULT_CNPJ).replace(/\D/gu, '')
  if (!/^\d{14}$/u.test(cnpj)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--cnpj must contain 14 digits.')
  }
  return { cnpj }
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text()
  if (text.trim() === '') {
    return undefined
  }
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new RuntimeFailure('OPEN_API_FAILED', 'ReceitaWS returned non-JSON content.', {
      status: response.status,
      preview: text.slice(0, 120),
    })
  }
}

function parseCompany(value: unknown): ReceitaWsCompany {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'ReceitaWS company response had an unexpected schema.')
  }
  const status = readString(value.status) ?? 'UNKNOWN'
  if (status.toUpperCase() === 'ERROR') {
    throw new RuntimeFailure('OPEN_API_FAILED', readApiMessage(value) ?? 'ReceitaWS returned an error response.', {
      provider: 'receitaws',
    })
  }
  const cnpj = normalizeReceitaWsLookupInput({ cnpj: readString(value.cnpj) ?? '' }).cnpj
  return {
    cnpj,
    status,
    name: readString(value.nome),
    alias: readString(value.fantasia),
    openingDate: readString(value.abertura),
    situation: readString(value.situacao),
    type: readString(value.tipo),
    size: readString(value.porte),
    legalNature: readString(value.natureza_juridica),
    primaryActivities: parseActivities(value.atividade_principal),
    secondaryActivities: parseActivities(value.atividades_secundarias),
    street: readString(value.logradouro),
    number: readString(value.numero),
    complement: readString(value.complemento),
    district: readString(value.bairro),
    city: readString(value.municipio),
    state: readString(value.uf),
    zip: readString(value.cep),
    email: readString(value.email),
    phone: readString(value.telefone),
    shareCapital: readString(value.capital_social),
    updatedAt: readString(value.ultima_atualizacao),
  }
}

function parseActivities(value: unknown): ReceitaWsActivity[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.map(parseActivity).filter((entry): entry is ReceitaWsActivity => entry !== undefined)
}

function parseActivity(value: unknown): ReceitaWsActivity | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  const code = readString(value.code)
  const text = readString(value.text)
  if (code === undefined || text === undefined) {
    return undefined
  }
  return { code, text }
}

function readApiMessage(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  return readString(value.message) ?? readString(value.mensagem)
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
