import {
  COVID_TRACKING_DEFAULT_STATE,
  COVID_TRACKING_MAX_LIMIT,
  COVID_TRACKING_MAX_STATE_LIMIT,
  CovidTrackingClient,
  normalizeCovidTrackingStateDailyInput,
  normalizeCovidTrackingStatesInput,
  normalizeCovidTrackingUsDailyInput,
  type CovidTrackingDailyRow,
  type CovidTrackingState,
  type CovidTrackingStateDailyInput,
  type CovidTrackingStatesInput,
  type CovidTrackingUsDailyInput,
} from '../../infrastructure/openApis/covidTrackingClient.js'

type CovidTrackingApiMeta = {
  provider: 'covidtracking'
  publicApisProject: string
  endpoint: string
  docsUrl: string
  usesBrowserClickstream: false
  authentication: 'none'
  transport: 'HTTPS JSON static archive API'
  licenseNote: string
  archiveNote: string
  limitPolicy: string
}

export type CovidTrackingUsDailyResult = {
  kind: 'covidtracking.usDaily'
  api: CovidTrackingApiMeta
  query: ReturnType<typeof normalizeCovidTrackingUsDailyInput>
  count: number
  meta: {
    buildTime?: string | undefined
    license?: string | undefined
    version?: string | undefined
  }
  pagination: {
    returned: number
    limit: number
    maxLimit: number
  }
  rows: CovidTrackingDailyRow[]
}

export type CovidTrackingStatesResult = {
  kind: 'covidtracking.states'
  api: CovidTrackingApiMeta
  query: ReturnType<typeof normalizeCovidTrackingStatesInput>
  count: number
  meta: {
    buildTime?: string | undefined
    license?: string | undefined
    version?: string | undefined
  }
  pagination: {
    returned: number
    limit: number
    maxLimit: number
  }
  states: CovidTrackingState[]
}

export type CovidTrackingStateDailyResult = {
  kind: 'covidtracking.stateDaily'
  api: CovidTrackingApiMeta
  query: ReturnType<typeof normalizeCovidTrackingStateDailyInput>
  count: number
  meta: {
    buildTime?: string | undefined
    license?: string | undefined
    version?: string | undefined
  }
  pagination: {
    returned: number
    limit: number
    maxLimit: number
  }
  rows: CovidTrackingDailyRow[]
}

export async function readCovidTrackingUsDaily(input: CovidTrackingUsDailyInput = {}): Promise<CovidTrackingUsDailyResult> {
  const query = normalizeCovidTrackingUsDailyInput(input)
  const client = new CovidTrackingClient()
  const response = await client.readUsDaily(query)
  return {
    kind: 'covidtracking.usDaily',
    api: createApiMeta('GET /v2/us/daily.json', 'US daily archive has 420 rows; CLI defaults/caps at 420 to use one static JSON request.'),
    query,
    count: response.rows.length,
    meta: response.meta,
    pagination: {
      returned: response.rows.length,
      limit: query.limit,
      maxLimit: COVID_TRACKING_MAX_LIMIT,
    },
    rows: response.rows,
  }
}

export async function listCovidTrackingStates(input: CovidTrackingStatesInput = {}): Promise<CovidTrackingStatesResult> {
  const query = normalizeCovidTrackingStatesInput(input)
  const client = new CovidTrackingClient()
  const response = await client.listStates(query)
  return {
    kind: 'covidtracking.states',
    api: createApiMeta('GET /v2/states.json', 'States archive has 56 rows; CLI defaults/caps at 56 to use one static JSON request.'),
    query,
    count: response.rows.length,
    meta: response.meta,
    pagination: {
      returned: response.rows.length,
      limit: query.limit,
      maxLimit: COVID_TRACKING_MAX_STATE_LIMIT,
    },
    states: response.rows,
  }
}

export async function readCovidTrackingStateDaily(input: CovidTrackingStateDailyInput = {}): Promise<CovidTrackingStateDailyResult> {
  const query = normalizeCovidTrackingStateDailyInput(input)
  const client = new CovidTrackingClient()
  const response = await client.readStateDaily(query)
  return {
    kind: 'covidtracking.stateDaily',
    api: createApiMeta(`GET /v2/states/${query.state}/daily.json`, `State daily archive defaults/caps at 420 rows; default state is ${COVID_TRACKING_DEFAULT_STATE.toUpperCase()}.`),
    query,
    count: response.rows.length,
    meta: response.meta,
    pagination: {
      returned: response.rows.length,
      limit: query.limit,
      maxLimit: COVID_TRACKING_MAX_LIMIT,
    },
    rows: response.rows,
  }
}

function createApiMeta(endpoint: string, limitPolicy: string): CovidTrackingApiMeta {
  return {
    provider: 'covidtracking',
    publicApisProject: 'https://github.com/public-apis/public-apis',
    endpoint,
    docsUrl: 'https://covidtracking.com/data/api/version-2',
    usesBrowserClickstream: false,
    authentication: 'none',
    transport: 'HTTPS JSON static archive API',
    licenseNote: 'COVID Tracking Project API metadata reports CC-BY-4.0.',
    archiveNote: 'The COVID Tracking Project stopped collecting data in March 2021; this provider exposes the archived static v2 API.',
    limitPolicy,
  }
}
