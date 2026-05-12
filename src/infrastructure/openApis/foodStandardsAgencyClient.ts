import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const FSA_DEFAULT_AUTHORITY_LIMIT = 5000
export const FSA_MAX_AUTHORITY_LIMIT = 5000
export const FSA_DEFAULT_ESTABLISHMENT_QUERY = 'coffee'
export const FSA_DEFAULT_ESTABLISHMENT_LIMIT = 5000
export const FSA_MAX_ESTABLISHMENT_LIMIT = 5000
export const FSA_DEFAULT_PAGE_NUMBER = 1

type FetchImpl = typeof fetch

export type FoodStandardsAgencyAuthoritiesInput = {
  limit?: number | undefined
}

export type NormalizedFoodStandardsAgencyAuthoritiesInput = {
  limit: number
}

export type FoodStandardsAgencyEstablishmentsInput = {
  query?: string | undefined
  localAuthorityId?: number | undefined
  ratingValue?: string | undefined
  pageSize?: number | undefined
  pageNumber?: number | undefined
}

export type NormalizedFoodStandardsAgencyEstablishmentsInput = {
  query?: string | undefined
  localAuthorityId?: number | undefined
  ratingValue?: string | undefined
  pageSize: number
  pageNumber: number
}

export type FoodStandardsAgencyMeta = {
  dataSource?: string | undefined
  extractDate?: string | undefined
  itemCount?: number | undefined
  returnCode?: string | undefined
  totalCount?: number | undefined
  totalPages?: number | undefined
  pageSize?: number | undefined
  pageNumber?: number | undefined
}

export type FoodStandardsAgencyAuthority = {
  id: number
  code?: string | undefined
  name?: string | undefined
  friendlyName?: string | undefined
  url?: string | undefined
  regionName?: string | undefined
  fileName?: string | undefined
  establishmentCount?: number | undefined
  lastPublishedDate?: string | undefined
  schemeType?: number | undefined
}

export type FoodStandardsAgencyEstablishment = {
  id: number
  businessName?: string | undefined
  businessType?: string | undefined
  ratingValue?: string | undefined
  ratingDate?: string | undefined
  schemeType?: string | undefined
  localAuthorityName?: string | undefined
  localAuthorityCode?: string | undefined
  address?: string | undefined
  postCode?: string | undefined
  latitude?: number | undefined
  longitude?: number | undefined
  scores: {
    hygiene?: number | undefined
    structural?: number | undefined
    confidenceInManagement?: number | undefined
  }
  newRatingPending?: boolean | undefined
}

export class FoodStandardsAgencyClient {
  constructor(private readonly options: { fetchImpl?: FetchImpl | undefined } = {}) {}

  async listAuthorities(input: NormalizedFoodStandardsAgencyAuthoritiesInput): Promise<{ authorities: FoodStandardsAgencyAuthority[]; meta: FoodStandardsAgencyMeta }> {
    const url = new URL('/Authorities/basic', 'https://api.ratings.food.gov.uk')
    const parsed = await this.fetchJson(url)
    const authorities = parseAuthorities(parsed).slice(0, input.limit)
    return {
      authorities,
      meta: parseMeta(parsed),
    }
  }

  async searchEstablishments(input: NormalizedFoodStandardsAgencyEstablishmentsInput): Promise<{ establishments: FoodStandardsAgencyEstablishment[]; meta: FoodStandardsAgencyMeta }> {
    const url = new URL('/Establishments', 'https://api.ratings.food.gov.uk')
    if (input.query !== undefined) {
      url.searchParams.set('name', input.query)
    }
    if (input.localAuthorityId !== undefined) {
      url.searchParams.set('localAuthorityId', String(input.localAuthorityId))
    }
    if (input.ratingValue !== undefined) {
      url.searchParams.set('ratingKey', normalizeRatingKey(input.ratingValue))
    }
    url.searchParams.set('pageSize', String(input.pageSize))
    url.searchParams.set('pageNumber', String(input.pageNumber))
    const parsed = await this.fetchJson(url)
    return {
      establishments: parseEstablishments(parsed),
      meta: parseMeta(parsed),
    }
  }

  private async fetchJson(url: URL): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? fetch
    const response = await fetchImpl(url, {
      headers: {
        accept: 'application/json',
        'x-api-version': '2',
      },
    })
    const text = await response.text()
    let parsed: unknown
    try {
      parsed = JSON.parse(text) as unknown
    } catch {
      throw new RuntimeFailure('OPEN_API_FAILED', 'Food Standards Agency returned non-JSON content.', {
        status: response.status,
        preview: text.slice(0, 120),
      })
    }
    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Food Standards Agency request failed with HTTP ${response.status}.`, {
        status: response.status,
        response: parsed,
      })
    }
    return parsed
  }
}

export function normalizeFoodStandardsAgencyAuthoritiesInput(input: FoodStandardsAgencyAuthoritiesInput = {}): NormalizedFoodStandardsAgencyAuthoritiesInput {
  return {
    limit: normalizeInteger(input.limit, '--limit', FSA_DEFAULT_AUTHORITY_LIMIT, 1, FSA_MAX_AUTHORITY_LIMIT),
  }
}

export function normalizeFoodStandardsAgencyEstablishmentsInput(input: FoodStandardsAgencyEstablishmentsInput = {}): NormalizedFoodStandardsAgencyEstablishmentsInput {
  const query = input.query?.trim() || FSA_DEFAULT_ESTABLISHMENT_QUERY
  if (query.length > 120) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--query must be 120 characters or fewer.')
  }
  const ratingValue = input.ratingValue?.trim()
  if (ratingValue !== undefined && ratingValue !== '' && !['0', '1', '2', '3', '4', '5', 'Pass', 'Improvement Required', 'Exempt'].includes(ratingValue)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--rating-value must be one of 0, 1, 2, 3, 4, 5, Pass, Improvement Required, or Exempt.')
  }
  return {
    query,
    ...(input.localAuthorityId !== undefined ? { localAuthorityId: normalizeInteger(input.localAuthorityId, '--local-authority-id', input.localAuthorityId, 1, 10_000) } : {}),
    ...(ratingValue !== undefined && ratingValue !== '' ? { ratingValue } : {}),
    pageSize: normalizeInteger(input.pageSize, '--page-size', FSA_DEFAULT_ESTABLISHMENT_LIMIT, 1, FSA_MAX_ESTABLISHMENT_LIMIT),
    pageNumber: normalizeInteger(input.pageNumber, '--page-number', FSA_DEFAULT_PAGE_NUMBER, 1, 10_000),
  }
}

function parseAuthorities(value: unknown): FoodStandardsAgencyAuthority[] {
  if (!isRecord(value) || !Array.isArray(value.authorities)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Food Standards Agency authorities response had an unexpected schema.')
  }
  return value.authorities.map(parseAuthority).filter((entry): entry is FoodStandardsAgencyAuthority => entry !== undefined)
}

function parseAuthority(value: unknown): FoodStandardsAgencyAuthority | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  const id = readNumber(value.LocalAuthorityId)
  if (id === undefined) {
    return undefined
  }
  return {
    id,
    code: readString(value.LocalAuthorityIdCode),
    name: readString(value.Name),
    friendlyName: readString(value.FriendlyName),
    url: readString(value.Url),
    regionName: readString(value.RegionName),
    fileName: readString(value.FileName),
    establishmentCount: readNumber(value.EstablishmentCount),
    lastPublishedDate: readString(value.LastPublishedDate),
    schemeType: readNumber(value.SchemeType),
  }
}

function parseEstablishments(value: unknown): FoodStandardsAgencyEstablishment[] {
  if (!isRecord(value) || !Array.isArray(value.establishments)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Food Standards Agency establishments response had an unexpected schema.')
  }
  return value.establishments.map(parseEstablishment).filter((entry): entry is FoodStandardsAgencyEstablishment => entry !== undefined)
}

function parseEstablishment(value: unknown): FoodStandardsAgencyEstablishment | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  const id = readNumber(value.FHRSID)
  if (id === undefined) {
    return undefined
  }
  const geocode = isRecord(value.geocode) ? value.geocode : {}
  const scores = isRecord(value.scores) ? value.scores : {}
  return {
    id,
    businessName: readString(value.BusinessName),
    businessType: readString(value.BusinessType),
    ratingValue: readString(value.RatingValue),
    ratingDate: readString(value.RatingDate),
    schemeType: readString(value.SchemeType),
    localAuthorityName: readString(value.LocalAuthorityName),
    localAuthorityCode: readString(value.LocalAuthorityCode),
    address: formatAddress(value),
    postCode: readString(value.PostCode),
    latitude: readNumber(geocode.latitude),
    longitude: readNumber(geocode.longitude),
    scores: {
      hygiene: readNumber(scores.Hygiene),
      structural: readNumber(scores.Structural),
      confidenceInManagement: readNumber(scores.ConfidenceInManagement),
    },
    newRatingPending: readBoolean(value.NewRatingPending),
  }
}

function parseMeta(value: unknown): FoodStandardsAgencyMeta {
  if (!isRecord(value) || !isRecord(value.meta)) {
    return {}
  }
  return {
    dataSource: readString(value.meta.dataSource),
    extractDate: readString(value.meta.extractDate),
    itemCount: readNumber(value.meta.itemCount),
    returnCode: readString(value.meta.returncode),
    totalCount: readNumber(value.meta.totalCount),
    totalPages: readNumber(value.meta.totalPages),
    pageSize: readNumber(value.meta.pageSize),
    pageNumber: readNumber(value.meta.pageNumber),
  }
}

function normalizeRatingKey(value: string): string {
  if (/^[0-5]$/u.test(value)) {
    return `fhrs_${value}_en-gb`
  }
  if (value === 'Pass') {
    return 'fhis_pass_en-gb'
  }
  if (value === 'Improvement Required') {
    return 'fhis_improvement_required_en-gb'
  }
  if (value === 'Exempt') {
    return 'fhrs_exempt_en-gb'
  }
  return value
}

function normalizeInteger(value: number | undefined, name: string, defaultValue: number, min: number, max: number): number {
  const normalized = value ?? defaultValue
  if (!Number.isInteger(normalized) || normalized < min || normalized > max) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${name} must be an integer from ${min} to ${max}.`)
  }
  return normalized
}

function formatAddress(value: Record<string, unknown>): string | undefined {
  const address = [value.AddressLine1, value.AddressLine2, value.AddressLine3, value.AddressLine4]
    .map(readString)
    .filter((entry): entry is string => entry !== undefined)
    .join(', ')
  return address === '' ? undefined : address
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
