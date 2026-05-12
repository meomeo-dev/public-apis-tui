import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const ADRESSE_BASE_URL = 'https://data.geopf.fr'
export const ADRESSE_DEFAULT_QUERY = '8 bd du port'
export const ADRESSE_DEFAULT_LIMIT = 10
export const ADRESSE_MAX_LIMIT = 50
export const ADRESSE_DEFAULT_LATITUDE = 48.357
export const ADRESSE_DEFAULT_LONGITUDE = 2.37

export type AdresseSearchInput = {
  query?: string | undefined
  limit?: number | undefined
  latitude?: number | undefined
  longitude?: number | undefined
  postcode?: string | undefined
  citycode?: string | undefined
  type?: AdresseAddressType | undefined
}

export type AdresseReverseInput = {
  latitude?: number | undefined
  longitude?: number | undefined
  limit?: number | undefined
  type?: AdresseAddressType | undefined
}

export type AdresseAddressType = 'housenumber' | 'street' | 'locality' | 'municipality'

export type NormalizedAdresseSearchInput = {
  query: string
  limit: number
  latitude?: number | undefined
  longitude?: number | undefined
  postcode?: string | undefined
  citycode?: string | undefined
  type?: AdresseAddressType | undefined
}

export type NormalizedAdresseReverseInput = {
  latitude: number
  longitude: number
  limit: number
  type?: AdresseAddressType | undefined
}

export type AdresseFeature = {
  label: string
  name?: string | undefined
  score?: number | undefined
  distance?: number | undefined
  type?: string | undefined
  housenumber?: string | undefined
  street?: string | undefined
  postcode?: string | undefined
  citycode?: string | undefined
  city?: string | undefined
  context?: string | undefined
  id?: string | undefined
  banId?: string | undefined
  coordinates: {
    longitude: number
    latitude: number
  }
}

export type AdresseFeatureCollection = {
  type: 'FeatureCollection'
  query?: string | undefined
  features: AdresseFeature[]
}

export class AdresseClient {
  constructor(
    private readonly options: {
      baseUrl?: string | undefined
      fetchImpl?: typeof fetch | undefined
    } = {},
  ) {}

  async search(input: NormalizedAdresseSearchInput): Promise<AdresseFeatureCollection> {
    const url = new URL(
      '/geocodage/search',
      this.options.baseUrl ?? ADRESSE_BASE_URL,
    )
    url.searchParams.set('q', input.query)
    url.searchParams.set('limit', String(input.limit))
    if (input.latitude !== undefined && input.longitude !== undefined) {
      url.searchParams.set('lat', String(input.latitude))
      url.searchParams.set('lon', String(input.longitude))
    }
    if (input.postcode !== undefined) {
      url.searchParams.set('postcode', input.postcode)
    }
    if (input.citycode !== undefined) {
      url.searchParams.set('citycode', input.citycode)
    }
    if (input.type !== undefined) {
      url.searchParams.set('type', input.type)
    }
    const parsed = await this.fetchJson(url)
    return parseFeatureCollection(parsed)
  }

  async reverse(
    input: NormalizedAdresseReverseInput,
  ): Promise<AdresseFeatureCollection> {
    const url = new URL(
      '/geocodage/reverse',
      this.options.baseUrl ?? ADRESSE_BASE_URL,
    )
    url.searchParams.set('lat', String(input.latitude))
    url.searchParams.set('lon', String(input.longitude))
    url.searchParams.set('limit', String(input.limit))
    if (input.type !== undefined) {
      url.searchParams.set('type', input.type)
    }
    const parsed = await this.fetchJson(url)
    return parseFeatureCollection(parsed)
  }

  private async fetchJson(url: URL): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json' } })
    } catch (error) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        `adresse.data.gouv.fr request failed: ${String(error)}`,
        {
          provider: 'adresse',
          endpoint: url.href,
        },
      )
    }

    let body: string
    try {
      body = await response.text()
    } catch (error) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        `adresse.data.gouv.fr response body could not be read: ${String(error)}`,
        {
          provider: 'adresse',
          status: response.status,
          endpoint: url.href,
        },
      )
    }

    if (isCloudflareChallenge(response, body)) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        [
          'adresse.data.gouv.fr is currently returning a Cloudflare challenge',
          'HTML page instead of the documented GeoJSON API response;',
          'retry later or use cached/offline data.',
        ].join(' '),
        {
          provider: 'adresse',
          status: response.status,
          endpoint: url.href,
          contentType: response.headers.get('content-type') ?? undefined,
        },
      )
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(body)
    } catch (error) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        `adresse.data.gouv.fr returned a non-JSON response: ${String(error)}`,
        {
          provider: 'adresse',
          status: response.status,
          endpoint: url.href,
          contentType: response.headers.get('content-type') ?? undefined,
        },
      )
    }

    if (!response.ok || isErrorResponse(parsed)) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        readErrorMessage(parsed) ??
          `adresse.data.gouv.fr request failed with HTTP ${response.status}.`,
        {
          provider: 'adresse',
          status: response.status,
          endpoint: url.href,
          response: parsed,
        },
      )
    }

    return parsed
  }
}

export function normalizeAdresseSearchInput(
  input: AdresseSearchInput = {},
): NormalizedAdresseSearchInput {
  const latitude =
    input.latitude === undefined ? undefined : normalizeLatitude(input.latitude)
  const longitude =
    input.longitude === undefined ? undefined : normalizeLongitude(input.longitude)
  if ((latitude === undefined) !== (longitude === undefined)) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      '--latitude and --longitude must be provided together for search bias.',
    )
  }
  return {
    query: normalizeQuery(input.query ?? ADRESSE_DEFAULT_QUERY),
    limit: normalizeLimit(input.limit),
    ...(latitude !== undefined ? { latitude } : {}),
    ...(longitude !== undefined ? { longitude } : {}),
    ...(input.postcode !== undefined
      ? { postcode: normalizePostcode(input.postcode) }
      : {}),
    ...(input.citycode !== undefined
      ? { citycode: normalizeCitycode(input.citycode) }
      : {}),
    ...(input.type !== undefined ? { type: normalizeAddressType(input.type) } : {}),
  }
}

export function normalizeAdresseReverseInput(
  input: AdresseReverseInput = {},
): NormalizedAdresseReverseInput {
  return {
    latitude: normalizeLatitude(input.latitude ?? ADRESSE_DEFAULT_LATITUDE),
    longitude: normalizeLongitude(input.longitude ?? ADRESSE_DEFAULT_LONGITUDE),
    limit: normalizeLimit(input.limit),
    ...(input.type !== undefined ? { type: normalizeAddressType(input.type) } : {}),
  }
}

function parseFeatureCollection(value: unknown): AdresseFeatureCollection {
  if (
    !isRecord(value) ||
    value.type !== 'FeatureCollection' ||
    !Array.isArray(value.features)
  ) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'adresse.data.gouv.fr response had an unexpected GeoJSON schema.',
    )
  }
  return {
    type: 'FeatureCollection',
    query: optionalString(value.query),
    features: value.features
      .map(parseFeature)
      .filter((feature): feature is AdresseFeature => feature !== undefined),
  }
}

function parseFeature(value: unknown): AdresseFeature | undefined {
  if (!isRecord(value) || !isRecord(value.geometry) || !isRecord(value.properties)) {
    return undefined
  }
  const coordinates = Array.isArray(value.geometry.coordinates)
    ? value.geometry.coordinates
    : []
  const longitude = optionalNumber(coordinates[0])
  const latitude = optionalNumber(coordinates[1])
  const label = optionalString(value.properties.label)
  if (longitude === undefined || latitude === undefined || label === undefined) {
    return undefined
  }
  return {
    label,
    name: optionalString(value.properties.name),
    score: optionalNumber(value.properties.score),
    distance: optionalNumber(value.properties.distance),
    type: optionalString(value.properties.type),
    housenumber: optionalString(value.properties.housenumber),
    street: optionalString(value.properties.street),
    postcode: optionalString(value.properties.postcode),
    citycode: optionalString(value.properties.citycode),
    city: optionalString(value.properties.city),
    context: optionalString(value.properties.context),
    id: optionalString(value.properties.id),
    banId: optionalString(value.properties.banId),
    coordinates: { longitude, latitude },
  }
}

function normalizeQuery(value: string): string {
  const query = value.trim().replace(/\s+/gu, ' ')
  if (query.length < 2 || query.length > 200) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      '--query must be between 2 and 200 characters.',
    )
  }
  return query
}

function normalizeLimit(value: number | undefined): number {
  const limit = value ?? ADRESSE_DEFAULT_LIMIT
  if (!Number.isInteger(limit) || limit < 1 || limit > ADRESSE_MAX_LIMIT) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      `--limit must be an integer from 1 to ${ADRESSE_MAX_LIMIT}.`,
    )
  }
  return limit
}

function normalizeLatitude(value: number): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < -90 ||
    value > 90
  ) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      '--latitude must be a number from -90 to 90.',
    )
  }
  return value
}

function normalizeLongitude(value: number): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < -180 ||
    value > 180
  ) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      '--longitude must be a number from -180 to 180.',
    )
  }
  return value
}

function normalizePostcode(value: string): string {
  const postcode = value.trim()
  if (!/^\d{5}$/u.test(postcode)) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      '--postcode must be a 5-digit French postal code.',
    )
  }
  return postcode
}

function normalizeCitycode(value: string): string {
  const citycode = value.trim().toUpperCase()
  if (!/^\d[A-Z0-9]\d{3}$/u.test(citycode)) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      '--citycode must be a 5-character INSEE city code, e.g. 75101.',
    )
  }
  return citycode
}

function normalizeAddressType(value: AdresseAddressType): AdresseAddressType {
  if (
    value === 'housenumber' ||
    value === 'street' ||
    value === 'locality' ||
    value === 'municipality'
  ) {
    return value
  }
  throw new RuntimeFailure(
    'INVALID_ARGUMENT',
    '--type must be one of housenumber, street, locality, or municipality.',
    {
      supported: ['housenumber', 'street', 'locality', 'municipality'],
    },
  )
}

function isErrorResponse(value: unknown): boolean {
  return (
    isRecord(value) &&
    (typeof value.code === 'number' || typeof value.message === 'string')
  )
}

function readErrorMessage(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined
  if (typeof value.message !== 'string') return undefined
  const detail = Array.isArray(value.detail)
    ? value.detail
      .filter((entry): entry is string => typeof entry === 'string')
      .join('; ')
    : undefined
  return detail === undefined || detail === ''
    ? value.message
    : `${value.message}: ${detail}`
}

function isCloudflareChallenge(response: Response, body: string): boolean {
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
  const server = response.headers.get('server')?.toLowerCase() ?? ''
  const cfMitigated = response.headers.get('cf-mitigated')?.toLowerCase() ?? ''
  const bodyLower = body.toLowerCase()
  return (
    cfMitigated === 'challenge' ||
    (server.includes('cloudflare') &&
      contentType.includes('text/html') &&
      (response.status === 403 || response.status === 429) &&
      (bodyLower.includes('<title>just a moment...</title>') ||
        bodyLower.includes('cloudflare')))
  )
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
