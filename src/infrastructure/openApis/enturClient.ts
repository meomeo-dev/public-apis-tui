import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const ENTUR_DEFAULT_GEOCODER_URL = 'https://api.entur.io/geocoder/v1'
export const ENTUR_DEFAULT_JOURNEY_PLANNER_URL = 'https://api.entur.io/journey-planner/v3/graphql'
export const ENTUR_DEFAULT_CLIENT_NAME = 'public-apis-tui-cli'
export const ENTUR_DEFAULT_PLACE_TEXT = 'Oslo S'
export const ENTUR_DEFAULT_LANG = 'en'
export const ENTUR_DEFAULT_LAYERS = 'venue'
export const ENTUR_DEFAULT_SIZE = 100
export const ENTUR_MAX_SIZE = 100
export const ENTUR_DEFAULT_STOP_PLACE_ID = 'NSR:StopPlace:59872'
export const ENTUR_DEFAULT_DEPARTURES = 20
export const ENTUR_MAX_DEPARTURES = 100

export type EnturPlacesInput = {
  text?: string | undefined
  lang?: string | undefined
  layers?: string | undefined
  size?: number | undefined
  boundaryCountry?: string | undefined
  clientName?: string | undefined
}

export type NormalizedEnturPlacesInput = {
  text: string
  lang: string
  layers: string
  size: number
  clientName: string
  boundaryCountry?: string | undefined
}

export type EnturDeparturesInput = {
  stopPlaceId?: string | undefined
  departures?: number | undefined
  transportMode?: string | undefined
  clientName?: string | undefined
}

export type NormalizedEnturDeparturesInput = {
  stopPlaceId: string
  departures: number
  clientName: string
  transportMode?: string | undefined
}

export type EnturRateLimit = {
  allowed?: string | undefined
  used?: string | undefined
  available?: string | undefined
  range?: string | undefined
  expiryTime?: string | undefined
}

export type EnturPlace = {
  id: string
  name: string
  label?: string | undefined
  layer?: string | undefined
  locality?: string | undefined
  county?: string | undefined
  country?: string | undefined
  categories: string[]
  latitude?: number | undefined
  longitude?: number | undefined
  modes: string[]
}

export type EnturDeparture = {
  expectedDepartureTime?: string | undefined
  actualDepartureTime?: string | undefined
  destination?: string | undefined
  lineCode?: string | undefined
  lineName?: string | undefined
  transportMode?: string | undefined
}

export type EnturPlacesResponse = {
  places: EnturPlace[]
  rateLimit: EnturRateLimit
}

export type EnturDeparturesResponse = {
  stopPlace: {
    id: string
    name: string
  }
  departures: EnturDeparture[]
  rateLimit: EnturRateLimit
}

const departuresQuery = `query PublicApisTuiEnturDepartures($id: String!, $departures: Int!) {
  stopPlace(id: $id) {
    id
    name
    estimatedCalls(numberOfDepartures: $departures) {
      expectedDepartureTime
      actualDepartureTime
      destinationDisplay { frontText }
      serviceJourney { journeyPattern { line { publicCode name transportMode } } }
    }
  }
}`

export class EnturClient {
  constructor(private readonly options: { geocoderUrl?: string | undefined; journeyPlannerUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {}

  async places(input: NormalizedEnturPlacesInput): Promise<EnturPlacesResponse> {
    const url = new URL('autocomplete', normalizeBaseUrl(this.options.geocoderUrl ?? ENTUR_DEFAULT_GEOCODER_URL))
    url.searchParams.set('text', input.text)
    url.searchParams.set('lang', input.lang)
    url.searchParams.set('layers', input.layers)
    url.searchParams.set('size', String(input.size))
    if (input.boundaryCountry !== undefined) url.searchParams.set('boundary.country', input.boundaryCountry)
    const { parsed, response } = await this.fetchJson(url, input.clientName)
    return {
      places: parsePlaces(parsed).slice(0, input.size),
      rateLimit: readRateLimit(response),
    }
  }

  async departures(input: NormalizedEnturDeparturesInput): Promise<EnturDeparturesResponse> {
    const url = new URL(this.options.journeyPlannerUrl ?? ENTUR_DEFAULT_JOURNEY_PLANNER_URL)
    const body = JSON.stringify({ query: departuresQuery, variables: { id: input.stopPlaceId, departures: input.departures } })
    const { parsed, response } = await this.fetchJson(url, input.clientName, { method: 'POST', body, contentType: 'application/json' })
    const parsedDepartures = parseDepartures(parsed)
    const departures = input.transportMode === undefined
      ? parsedDepartures.departures
      : parsedDepartures.departures.filter(departure => departure.transportMode?.toLowerCase() === input.transportMode)
    return {
      stopPlace: parsedDepartures.stopPlace,
      departures: departures.slice(0, input.departures),
      rateLimit: readRateLimit(response),
    }
  }

  private async fetchJson(url: URL, clientName: string, options: { method?: string | undefined; body?: string | undefined; contentType?: string | undefined } = {}): Promise<{ parsed: unknown; response: Response }> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    const headers: Record<string, string> = { accept: 'application/json', 'ET-Client-Name': clientName }
    if (options.contentType !== undefined) headers['content-type'] = options.contentType
    const requestInit: RequestInit = { headers }
    if (options.method !== undefined) requestInit.method = options.method
    if (options.body !== undefined) requestInit.body = options.body
    let response: Response
    try {
      response = await fetchImpl(url, requestInit)
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Entur request failed: ${String(error)}`, { provider: 'entur', endpoint: url.href })
    }

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Entur returned a non-JSON response: ${String(error)}`, { provider: 'entur', endpoint: url.href, status: response.status })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed) ?? `Entur request failed with HTTP ${response.status}.`, { provider: 'entur', endpoint: url.href, status: response.status, response: parsed })
    }

    return { parsed, response }
  }
}

export function normalizeEnturPlacesInput(input: EnturPlacesInput = {}): NormalizedEnturPlacesInput {
  return {
    text: normalizeText(input.text ?? ENTUR_DEFAULT_PLACE_TEXT, '--text'),
    lang: normalizeLanguage(input.lang ?? ENTUR_DEFAULT_LANG),
    layers: normalizeText(input.layers ?? ENTUR_DEFAULT_LAYERS, '--layers'),
    size: normalizeInteger(input.size ?? ENTUR_DEFAULT_SIZE, '--size', 1, ENTUR_MAX_SIZE),
    clientName: normalizeClientName(input.clientName ?? ENTUR_DEFAULT_CLIENT_NAME),
    ...(input.boundaryCountry !== undefined ? { boundaryCountry: normalizeCountry(input.boundaryCountry) } : {}),
  }
}

export function normalizeEnturDeparturesInput(input: EnturDeparturesInput = {}): NormalizedEnturDeparturesInput {
  return {
    stopPlaceId: normalizeStopPlaceId(input.stopPlaceId ?? ENTUR_DEFAULT_STOP_PLACE_ID),
    departures: normalizeInteger(input.departures ?? ENTUR_DEFAULT_DEPARTURES, '--departures', 1, ENTUR_MAX_DEPARTURES),
    clientName: normalizeClientName(input.clientName ?? ENTUR_DEFAULT_CLIENT_NAME),
    ...(input.transportMode !== undefined ? { transportMode: normalizeText(input.transportMode, '--transport-mode').toLowerCase() } : {}),
  }
}

function parsePlaces(value: unknown): EnturPlace[] {
  if (!isRecord(value) || !Array.isArray(value.features)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Entur geocoder response must include features[].')
  }
  return value.features.filter(isRecord).map(parsePlace)
}

function parsePlace(value: Record<string, unknown>): EnturPlace {
  const properties = isRecord(value.properties) ? value.properties : {}
  const geometry = isRecord(value.geometry) ? value.geometry : {}
  const id = properties.id
  const name = properties.name
  if (typeof id !== 'string' || typeof name !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Entur geocoder features must include properties.id/name.')
  }
  const coordinates = Array.isArray(geometry.coordinates) ? geometry.coordinates : []
  const [longitude, latitude] = coordinates
  return {
    id,
    name,
    label: optionalString(properties.label),
    layer: optionalString(properties.layer),
    locality: optionalString(properties.locality),
    county: optionalString(properties.county),
    country: optionalString(properties.country_a),
    categories: Array.isArray(properties.category) ? properties.category.filter((entry): entry is string => typeof entry === 'string') : [],
    latitude: typeof latitude === 'number' ? latitude : undefined,
    longitude: typeof longitude === 'number' ? longitude : undefined,
    modes: readModes(properties.mode),
  }
}

function parseDepartures(value: unknown): { stopPlace: { id: string; name: string }; departures: EnturDeparture[] } {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Entur Journey Planner response must be an object.')
  }
  const errors = Array.isArray(value.errors) ? value.errors : []
  if (errors.length > 0) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Entur Journey Planner returned GraphQL errors.', { errors })
  }
  const data = isRecord(value.data) ? value.data : {}
  const stopPlace = isRecord(data.stopPlace) ? data.stopPlace : undefined
  if (stopPlace === undefined || typeof stopPlace.id !== 'string' || typeof stopPlace.name !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Entur Journey Planner response must include data.stopPlace id/name.')
  }
  const estimatedCalls = Array.isArray(stopPlace.estimatedCalls) ? stopPlace.estimatedCalls.filter(isRecord) : []
  return {
    stopPlace: { id: stopPlace.id, name: stopPlace.name },
    departures: estimatedCalls.map(parseDeparture),
  }
}

function parseDeparture(value: Record<string, unknown>): EnturDeparture {
  const destinationDisplay = isRecord(value.destinationDisplay) ? value.destinationDisplay : {}
  const serviceJourney = isRecord(value.serviceJourney) ? value.serviceJourney : {}
  const journeyPattern = isRecord(serviceJourney.journeyPattern) ? serviceJourney.journeyPattern : {}
  const line = isRecord(journeyPattern.line) ? journeyPattern.line : {}
  return {
    expectedDepartureTime: optionalString(value.expectedDepartureTime),
    actualDepartureTime: optionalString(value.actualDepartureTime),
    destination: optionalString(destinationDisplay.frontText),
    lineCode: optionalString(line.publicCode),
    lineName: optionalString(line.name),
    transportMode: optionalString(line.transportMode),
  }
}

function readRateLimit(response: Response): EnturRateLimit {
  return {
    allowed: response.headers.get('rate-limit-allowed') ?? undefined,
    used: response.headers.get('rate-limit-used') ?? undefined,
    available: response.headers.get('rate-limit-available') ?? undefined,
    range: response.headers.get('rate-limit-range') ?? undefined,
    expiryTime: response.headers.get('rate-limit-expiry-time') ?? undefined,
  }
}

function readModes(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.flatMap(entry => isRecord(entry) ? Object.keys(entry) : []).filter(Boolean)
}

function normalizeStopPlaceId(value: string): string {
  const normalized = normalizeText(value, '--stop-place-id')
  if (!/^NSR:StopPlace:\d+$/u.test(normalized)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--stop-place-id must look like NSR:StopPlace:59872.')
  }
  return normalized
}

function normalizeLanguage(value: string): string {
  const normalized = value.trim().toLowerCase()
  if (!/^[a-z]{2}$/u.test(normalized)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--lang must be a two-letter language code such as en or no.')
  }
  return normalized
}

function normalizeCountry(value: string): string {
  const normalized = value.trim().toUpperCase()
  if (!/^[A-Z]{3}$/u.test(normalized)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--boundary-country must be a three-letter country code such as NOR.')
  }
  return normalized
}

function normalizeClientName(value: string): string {
  const normalized = normalizeText(value, '--client-name')
  if (!/^[\w .:@/-]{3,120}$/u.test(normalized)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--client-name must be 3-120 safe identifier characters.')
  }
  return normalized
}

function normalizeText(value: string, label: string): string {
  const normalized = value.trim()
  if (normalized === '') throw new RuntimeFailure('INVALID_ARGUMENT', `${label} cannot be empty.`)
  return normalized
}

function normalizeInteger(value: number, label: string, min: number, max: number): number {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must be an integer between ${min} and ${max}.`)
  }
  return value
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

function readErrorMessage(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined
  const error = value.error ?? value.message
  return typeof error === 'string' && error.trim() !== '' ? error : undefined
}

function normalizeBaseUrl(value: string): string {
  return value.endsWith('/') ? value : `${value}/`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
