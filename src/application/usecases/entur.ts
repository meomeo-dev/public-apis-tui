import {
  ENTUR_MAX_DEPARTURES,
  ENTUR_MAX_SIZE,
  EnturClient,
  normalizeEnturDeparturesInput,
  normalizeEnturPlacesInput,
  type EnturDeparture,
  type EnturDeparturesInput,
  type EnturPlace,
  type EnturPlacesInput,
  type EnturRateLimit,
} from '../../infrastructure/openApis/enturClient.js'

const docsUrl = 'https://developer.entur.org/'

export type EnturPlacesResult = {
  kind: 'entur.places'
  api: {
    provider: 'entur'
    endpoint: string
    authentication: 'none'
    usesBrowserClickstream: false
    docsUrl: string
    clientNameHeader: string
    limitPolicy: string
  }
  query: ReturnType<typeof normalizeEnturPlacesInput>
  places: EnturPlace[]
  count: number
  rateLimit: EnturRateLimit
}

export type EnturDeparturesResult = {
  kind: 'entur.departures'
  api: {
    provider: 'entur'
    endpoint: string
    authentication: 'none'
    usesBrowserClickstream: false
    docsUrl: string
    clientNameHeader: string
    limitPolicy: string
  }
  query: ReturnType<typeof normalizeEnturDeparturesInput>
  stopPlace: { id: string; name: string }
  departures: EnturDeparture[]
  count: number
  rateLimit: EnturRateLimit
}

export async function searchEnturPlaces(input: EnturPlacesInput = {}): Promise<EnturPlacesResult> {
  const query = normalizeEnturPlacesInput(input)
  const response = await new EnturClient().places(query)
  return {
    kind: 'entur.places',
    api: {
      provider: 'entur',
      endpoint: 'GET https://api.entur.io/geocoder/v1/autocomplete',
      authentication: 'none',
      usesBrowserClickstream: false,
      docsUrl,
      clientNameHeader: 'ET-Client-Name is a non-secret required client identifier, not an API credential.',
      limitPolicy: `Geocoder size uses documented max/default ${ENTUR_MAX_SIZE}.`,
    },
    query,
    places: response.places,
    count: response.places.length,
    rateLimit: response.rateLimit,
  }
}

export async function listEnturDepartures(input: EnturDeparturesInput = {}): Promise<EnturDeparturesResult> {
  const query = normalizeEnturDeparturesInput(input)
  const response = await new EnturClient().departures(query)
  return {
    kind: 'entur.departures',
    api: {
      provider: 'entur',
      endpoint: 'POST https://api.entur.io/journey-planner/v3/graphql',
      authentication: 'none',
      usesBrowserClickstream: false,
      docsUrl,
      clientNameHeader: 'ET-Client-Name is a non-secret required client identifier, not an API credential.',
      limitPolicy: `No public max found for estimatedCalls(numberOfDepartures); CLI caps --departures at ${ENTUR_MAX_DEPARTURES}.`,
    },
    query,
    stopPlace: response.stopPlace,
    departures: response.departures,
    count: response.departures.length,
    rateLimit: response.rateLimit,
  }
}
