import {
  SUNRISE_SUNSET_BASE_URL,
  SUNRISE_SUNSET_DEFAULT_DATE,
  SUNRISE_SUNSET_DEFAULT_LATITUDE,
  SUNRISE_SUNSET_DEFAULT_LONGITUDE,
  SUNRISE_SUNSET_DEFAULT_TZID,
  SUNRISE_SUNSET_DOCS_URL,
  SunriseSunsetClient,
  normalizeSunriseSunsetInput,
  type NormalizedSunriseSunsetInput,
  type SunriseSunsetInput,
  type SunriseSunsetTimes,
} from '../../infrastructure/openApis/sunriseSunsetClient.js'

export type SunriseSunsetApiMeta = {
  provider: 'sunrisesunset'
  endpoint: 'GET /json'
  docsUrl: typeof SUNRISE_SUNSET_DOCS_URL
  apiUrl: typeof SUNRISE_SUNSET_BASE_URL
  authentication: 'none'
  usesBrowserClickstream: false
  transport: 'HTTPS JSON REST'
  attributionRequired: true
  defaultDate: typeof SUNRISE_SUNSET_DEFAULT_DATE
  boundary: string
  excluded: string[]
}

export type SunriseSunsetTimesResult = {
  kind: 'sunrisesunset.times'
  api: SunriseSunsetApiMeta
  query: NormalizedSunriseSunsetInput
  status: 'OK'
  tzid: string
  times: SunriseSunsetTimes
}

export async function getSunriseSunsetTimes(
  input: SunriseSunsetInput = {},
): Promise<SunriseSunsetTimesResult> {
  const query = normalizeSunriseSunsetInput(input)
  const response = await new SunriseSunsetClient().getTimes(query)
  return {
    kind: 'sunrisesunset.times',
    api: createApiMeta(),
    query,
    status: response.status,
    tzid: response.tzid,
    times: response.results,
  }
}

export {
  SUNRISE_SUNSET_DEFAULT_DATE,
  SUNRISE_SUNSET_DEFAULT_LATITUDE,
  SUNRISE_SUNSET_DEFAULT_LONGITUDE,
  SUNRISE_SUNSET_DEFAULT_TZID,
  normalizeSunriseSunsetInput,
}

function createApiMeta(): SunriseSunsetApiMeta {
  return {
    provider: 'sunrisesunset',
    endpoint: 'GET /json',
    docsUrl: SUNRISE_SUNSET_DOCS_URL,
    apiUrl: SUNRISE_SUNSET_BASE_URL,
    authentication: 'none',
    usesBrowserClickstream: false,
    transport: 'HTTPS JSON REST',
    attributionRequired: true,
    defaultDate: SUNRISE_SUNSET_DEFAULT_DATE,
    boundary: [
      'Documented sunrise/sunset JSON endpoint only; relative dates, JSONP',
      'callback, HTML pages, browser search, scraping, arbitrary path proxying,',
      'account flows, binary payloads, and base64 payloads are excluded.',
    ].join(' '),
    excluded: [
      'JSONP callback',
      'relative date passthrough such as today or tomorrow',
      'HTML website search and browser clickstream',
      'arbitrary endpoint proxying',
    ],
  }
}
