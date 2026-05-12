import { z } from 'zod'
import { listCovidTrackingStates, readCovidTrackingStateDaily, readCovidTrackingUsDaily } from '../../application/usecases/covidTracking.js'
import {
  COVID_TRACKING_DEFAULT_LIMIT,
  COVID_TRACKING_DEFAULT_STATE,
  COVID_TRACKING_DEFAULT_STATE_LIMIT,
  normalizeCovidTrackingStateDailyInput,
  normalizeCovidTrackingStatesInput,
  normalizeCovidTrackingUsDailyInput,
  type CovidTrackingStateDailyInput,
  type CovidTrackingStatesInput,
  type CovidTrackingUsDailyInput,
} from '../../infrastructure/openApis/covidTrackingClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const usDailyParamsSchema = z.object({
  limit: z.coerce.number().optional(),
}) satisfies z.ZodType<CovidTrackingUsDailyInput>

const statesParamsSchema = z.object({
  limit: z.coerce.number().optional(),
}) satisfies z.ZodType<CovidTrackingStatesInput>

const stateDailyParamsSchema = z.object({
  state: z.string().optional(),
  limit: z.coerce.number().optional(),
}) satisfies z.ZodType<CovidTrackingStateDailyInput>

const usDailyOperation: PublicApiOperationDefinition<CovidTrackingUsDailyInput> = {
  id: 'covidtracking.usDaily',
  providerId: 'covidtracking',
  name: 'US Daily Archive',
  commandPath: ['covidtracking', 'us-daily'],
  rpcMethod: 'covidtracking.usDaily',
  description: 'Read archived COVID Tracking Project US daily totals.',
  category: 'health',
  options: [
    { name: 'limit', flag: '--limit <count>', description: `Rows to show, default/cap ${COVID_TRACKING_DEFAULT_LIMIT}`, exposure: 'primary', group: 'pagination', reason: 'The static archive has 420 rows; defaulting to the full archive avoids extra requests.', valueType: 'integer', defaultValue: String(COVID_TRACKING_DEFAULT_LIMIT) },
  ],
  paramsSchema: usDailyParamsSchema,
  execute: params => readCovidTrackingUsDaily(params),
  normalizeParams: params => usDailyParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeCovidTrackingUsDailyInput(params),
  resultKind: 'covidtracking.usDaily',
  defaultFormat: 'text',
}

const statesOperation: PublicApiOperationDefinition<CovidTrackingStatesInput> = {
  id: 'covidtracking.states',
  providerId: 'covidtracking',
  name: 'States Metadata',
  commandPath: ['covidtracking', 'states'],
  rpcMethod: 'covidtracking.states',
  description: 'Read archived COVID Tracking Project state metadata and sources.',
  category: 'health',
  options: [
    { name: 'limit', flag: '--limit <count>', description: `States to show, default/cap ${COVID_TRACKING_DEFAULT_STATE_LIMIT}`, exposure: 'primary', group: 'pagination', reason: 'The static state metadata archive has 56 rows; defaulting to the full list avoids extra requests.', valueType: 'integer', defaultValue: String(COVID_TRACKING_DEFAULT_STATE_LIMIT) },
  ],
  paramsSchema: statesParamsSchema,
  execute: params => listCovidTrackingStates(params),
  normalizeParams: params => statesParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeCovidTrackingStatesInput(params),
  resultKind: 'covidtracking.states',
  defaultFormat: 'text',
}

const stateDailyOperation: PublicApiOperationDefinition<CovidTrackingStateDailyInput> = {
  id: 'covidtracking.stateDaily',
  providerId: 'covidtracking',
  name: 'State Daily Archive',
  commandPath: ['covidtracking', 'state-daily'],
  rpcMethod: 'covidtracking.stateDaily',
  description: 'Read archived COVID Tracking Project daily totals for one state.',
  category: 'health',
  options: [
    { name: 'state', flag: '--state <code>', description: `Two-letter state code, default ${COVID_TRACKING_DEFAULT_STATE.toUpperCase()}`, exposure: 'primary', group: 'filters', reason: 'State code is the core selector for state-level archived daily data.', defaultValue: COVID_TRACKING_DEFAULT_STATE },
    { name: 'limit', flag: '--limit <count>', description: `Rows to show, default/cap ${COVID_TRACKING_DEFAULT_LIMIT}`, exposure: 'primary', group: 'pagination', reason: 'State daily archives have at most 420 rows; defaulting to the full archive avoids extra requests.', valueType: 'integer', defaultValue: String(COVID_TRACKING_DEFAULT_LIMIT) },
  ],
  paramsSchema: stateDailyParamsSchema,
  execute: params => readCovidTrackingStateDaily(params),
  normalizeParams: params => stateDailyParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeCovidTrackingStateDailyInput(params),
  resultKind: 'covidtracking.stateDaily',
  defaultFormat: 'text',
}

export const covidTrackingProvider: PublicApiProviderModule = {
  manifest: {
    id: 'covidtracking',
    name: 'Covid Tracking Project',
    description: 'No-auth archived COVID Tracking Project v2 static JSON API.',
    publicApisCategory: 'Health',
    homepageUrl: 'https://covidtracking.com/data/api/version-2',
    docsUrl: 'https://covidtracking.com/data/api/version-2',
    auth: { mode: 'none', notes: ['Archived v2 JSON endpoints require no API key, OAuth, cookies, browser session, or account setup.'] },
    tags: ['health', 'covid-19', 'archive', 'united-states', 'states', 'daily', 'no-auth', 'json'],
    freePlanNotes: [
      'The project stopped collecting data in March 2021; endpoints are static archive data.',
      'US/state daily archive defaults/caps at 420 rows, and states metadata defaults/caps at 56 rows.',
      'Use Open Disease for current disease data; this provider is intentionally historical.',
    ],
  },
  operations: [usDailyOperation, statesOperation, stateDailyOperation],
  endpoints: [
    { id: 'covidtracking-us-daily-v2', method: 'GET', urlPattern: 'https://api.covidtracking.com/v2/us/daily.json', category: 'public-apis:health', evidenceStatus: 'confirmed', description: 'COVID Tracking Project archived v2 US daily totals.', observedOn: '2026-05-04', sampleSources: ['https://covidtracking.com/data/api/version-2', 'https://api.covidtracking.com/v2/us/daily.json'], consumedBy: ['public-apis apis run covidtracking.usDaily'], notes: ['No authentication required; static archive data stopped updating in March 2021.'] },
    { id: 'covidtracking-states-v2', method: 'GET', urlPattern: 'https://api.covidtracking.com/v2/states.json', category: 'public-apis:health', evidenceStatus: 'confirmed', description: 'COVID Tracking Project archived v2 state metadata.', observedOn: '2026-05-04', sampleSources: ['https://covidtracking.com/data/api/version-2', 'https://api.covidtracking.com/v2/states.json'], consumedBy: ['public-apis apis run covidtracking.states'], notes: ['No authentication required; static archive source metadata.'] },
    { id: 'covidtracking-state-daily-v2', method: 'GET', urlPattern: 'https://api.covidtracking.com/v2/states/*/daily.json', category: 'public-apis:health', evidenceStatus: 'confirmed', description: 'COVID Tracking Project archived v2 state daily totals.', observedOn: '2026-05-04', sampleSources: ['https://covidtracking.com/data/api/version-2', 'https://api.covidtracking.com/v2/states/ca/daily.json'], consumedBy: ['public-apis apis run covidtracking.stateDaily'], notes: ['No authentication required; static archive data stopped updating in March 2021.'] },
  ],
}
