import { z } from 'zod'
import { listUsaSpendingAgencies, readUsaSpendingOverTime, searchUsaSpendingAwards } from '../../application/usecases/usaSpending.js'
import {
  normalizeUsaSpendingAgenciesInput,
  normalizeUsaSpendingAwardsInput,
  normalizeUsaSpendingOverTimeInput,
  USA_SPENDING_AGENCIES_DEFAULT_LIMIT,
  USA_SPENDING_AWARDS_DEFAULT_LIMIT,
  USA_SPENDING_DEFAULT_AWARD_TYPE_CODES,
  USA_SPENDING_DEFAULT_END_DATE,
  USA_SPENDING_DEFAULT_START_DATE,
  type UsaSpendingAgenciesInput,
  type UsaSpendingAwardsInput,
  type UsaSpendingOverTimeInput,
} from '../../infrastructure/openApis/usaSpendingClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const awardsParamsSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  awardTypeCodes: z.string().optional(),
  recipient: z.string().optional(),
  awardingAgency: z.string().optional(),
  limit: z.coerce.number().optional(),
  page: z.coerce.number().optional(),
  sort: z.string().optional(),
  order: z.string().optional(),
}) satisfies z.ZodType<UsaSpendingAwardsInput>

const overTimeParamsSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  awardTypeCodes: z.string().optional(),
  recipient: z.string().optional(),
  awardingAgency: z.string().optional(),
  group: z.string().optional(),
}) satisfies z.ZodType<UsaSpendingOverTimeInput>

const agenciesParamsSchema = z.object({
  sort: z.string().optional(),
  order: z.string().optional(),
  limit: z.coerce.number().optional(),
}) satisfies z.ZodType<UsaSpendingAgenciesInput>

const awardsOperation: PublicApiOperationDefinition<UsaSpendingAwardsInput> = {
  id: 'usaspending.awards',
  providerId: 'usaspending',
  name: 'Spending Awards',
  commandPath: ['usaspending', 'awards'],
  rpcMethod: 'usaspending.awards',
  description: 'Search USAspending.gov federal spending awards.',
  category: 'government',
  options: [
    { name: 'startDate', flag: '--start-date <YYYY-MM-DD>', description: `Start date, default ${USA_SPENDING_DEFAULT_START_DATE}`, exposure: 'primary', group: 'filters', reason: 'Federal spending analysis needs explicit, auditable date windows.', defaultValue: USA_SPENDING_DEFAULT_START_DATE },
    { name: 'endDate', flag: '--end-date <YYYY-MM-DD>', description: `End date, default ${USA_SPENDING_DEFAULT_END_DATE}`, exposure: 'primary', group: 'filters', reason: 'Federal spending analysis needs explicit, auditable date windows.', defaultValue: USA_SPENDING_DEFAULT_END_DATE },
    { name: 'awardTypeCodes', flag: '--award-type-codes <codes>', description: `Comma-separated award type codes, default ${USA_SPENDING_DEFAULT_AWARD_TYPE_CODES.join(',')}`, exposure: 'advanced', group: 'filters', reason: 'Award type codes are powerful but domain-specific; default focuses on contract award types for commercial analysis.', defaultValue: USA_SPENDING_DEFAULT_AWARD_TYPE_CODES.join(',') },
    { name: 'recipient', flag: '--recipient <text>', description: 'Recipient search text', exposure: 'primary', group: 'filters', reason: 'Recipient filtering supports vendor/customer analysis without exposing the entire advanced filter object.' },
    { name: 'awardingAgency', flag: '--awarding-agency <name>', description: 'Awarding toptier agency name, e.g. Department of Defense', exposure: 'primary', group: 'filters', reason: 'Agency filtering is a common spend-analysis task and maps to a documented AdvancedFilterObject agency entry.' },
    { name: 'limit', flag: '--limit <count>', description: `Rows to request, default/cap ${USA_SPENDING_AWARDS_DEFAULT_LIMIT}`, exposure: 'primary', group: 'pagination', reason: 'Live API rejects values above 100; default uses that max to conserve requests.', valueType: 'integer', defaultValue: String(USA_SPENDING_AWARDS_DEFAULT_LIMIT) },
    { name: 'page', flag: '--page <number>', description: 'Page number, default 1', exposure: 'advanced', group: 'pagination', reason: 'Page navigation is useful after inspecting the first max-sized page.', valueType: 'integer', defaultValue: '1' },
    { name: 'sort', flag: '--sort <field>', description: 'Sort field: Award Amount, Recipient Name, Awarding Agency, Start Date, End Date', exposure: 'advanced', group: 'presentation', reason: 'Sort choices are curated to documented response fields rather than exposing arbitrary API field names.', defaultValue: 'Award Amount' },
    { name: 'order', flag: '--order <asc|desc>', description: 'Sort order, default desc', exposure: 'advanced', group: 'presentation', reason: 'Sort direction is advanced because the default highlights largest awards first.', defaultValue: 'desc' },
  ],
  paramsSchema: awardsParamsSchema,
  execute: params => searchUsaSpendingAwards(params),
  normalizeParams: params => awardsParamsSchema.parse(toUsaSpendingSharedParams(params)),
  createCacheKeyParams: params => normalizeUsaSpendingAwardsInput(params),
  resultKind: 'usaspending.awards',
  defaultFormat: 'text',
}

const overTimeOperation: PublicApiOperationDefinition<UsaSpendingOverTimeInput> = {
  id: 'usaspending.overTime',
  providerId: 'usaspending',
  name: 'Spending Over Time',
  commandPath: ['usaspending', 'over-time'],
  rpcMethod: 'usaspending.overTime',
  description: 'Aggregate USAspending.gov federal spending over time.',
  category: 'government',
  options: [
    { name: 'startDate', flag: '--start-date <YYYY-MM-DD>', description: `Start date, default ${USA_SPENDING_DEFAULT_START_DATE}`, exposure: 'primary', group: 'filters', reason: 'Federal spending trend analysis needs explicit, auditable date windows.', defaultValue: USA_SPENDING_DEFAULT_START_DATE },
    { name: 'endDate', flag: '--end-date <YYYY-MM-DD>', description: `End date, default ${USA_SPENDING_DEFAULT_END_DATE}`, exposure: 'primary', group: 'filters', reason: 'Federal spending trend analysis needs explicit, auditable date windows.', defaultValue: USA_SPENDING_DEFAULT_END_DATE },
    { name: 'awardTypeCodes', flag: '--award-type-codes <codes>', description: `Comma-separated award type codes, default ${USA_SPENDING_DEFAULT_AWARD_TYPE_CODES.join(',')}`, exposure: 'advanced', group: 'filters', reason: 'Award type codes are powerful but domain-specific; default focuses on contract award types for commercial analysis.', defaultValue: USA_SPENDING_DEFAULT_AWARD_TYPE_CODES.join(',') },
    { name: 'recipient', flag: '--recipient <text>', description: 'Recipient search text', exposure: 'primary', group: 'filters', reason: 'Recipient filtering supports vendor trend analysis without exposing the full advanced filter object.' },
    { name: 'awardingAgency', flag: '--awarding-agency <name>', description: 'Awarding toptier agency name, e.g. Department of Defense', exposure: 'primary', group: 'filters', reason: 'Agency trend filtering is a common spend-analysis task.' },
    { name: 'group', flag: '--group <fiscal_year|calendar_year|quarter|month>', description: 'Time grouping, default fiscal_year', exposure: 'primary', group: 'presentation', reason: 'Time grouping is the core UX decision for trend output.', defaultValue: 'fiscal_year' },
  ],
  paramsSchema: overTimeParamsSchema,
  execute: params => readUsaSpendingOverTime(params),
  normalizeParams: params => overTimeParamsSchema.parse(toUsaSpendingSharedParams(params)),
  createCacheKeyParams: params => normalizeUsaSpendingOverTimeInput(params),
  resultKind: 'usaspending.overTime',
  defaultFormat: 'text',
}

const agenciesOperation: PublicApiOperationDefinition<UsaSpendingAgenciesInput> = {
  id: 'usaspending.agencies',
  providerId: 'usaspending',
  name: 'Toptier Agencies',
  commandPath: ['usaspending', 'agencies'],
  rpcMethod: 'usaspending.agencies',
  description: 'List USAspending.gov toptier agency budget and obligation totals.',
  category: 'government',
  options: [
    { name: 'limit', flag: '--limit <count>', description: `Agencies to show, default ${USA_SPENDING_AGENCIES_DEFAULT_LIMIT}`, exposure: 'primary', group: 'pagination', reason: 'The endpoint returns one list, and the CLI bounds terminal output/cache payloads.', valueType: 'integer', defaultValue: String(USA_SPENDING_AGENCIES_DEFAULT_LIMIT) },
    { name: 'sort', flag: '--sort <field>', description: 'Sort field: budget_authority_amount, obligated_amount, outlay_amount, percentage_of_total_budget_authority, agency_name', exposure: 'advanced', group: 'presentation', reason: 'Sort choices are curated to documented agency response fields.', defaultValue: 'budget_authority_amount' },
    { name: 'order', flag: '--order <asc|desc>', description: 'Sort order, default desc', exposure: 'advanced', group: 'presentation', reason: 'Sort direction is advanced because the default highlights largest agencies first.', defaultValue: 'desc' },
  ],
  paramsSchema: agenciesParamsSchema,
  execute: params => listUsaSpendingAgencies(params),
  normalizeParams: params => agenciesParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeUsaSpendingAgenciesInput(params),
  resultKind: 'usaspending.agencies',
  defaultFormat: 'text',
}

export const usaSpendingProvider: PublicApiProviderModule = {
  manifest: {
    id: 'usaspending',
    name: 'USAspending.gov',
    description: 'No-auth U.S. federal spending award search, time aggregates, and agency totals.',
    publicApisCategory: 'Government',
    homepageUrl: 'https://www.usaspending.gov/',
    docsUrl: 'https://api.usaspending.gov/docs/endpoints',
    auth: { mode: 'none', notes: ['Official API endpoints are public HTTPS JSON endpoints and live probes require no API key, OAuth, cookies, browser session, or account setup.'] },
    tags: ['government', 'usa', 'federal-spending', 'contracts', 'awards', 'agencies', 'commercial-analysis', 'no-auth', 'json'],
    freePlanNotes: [
      'Awards search defaults/caps at the live API maximum of 100 rows per request.',
      'Time aggregates expose spending trends without pagination.',
      'Toptier agencies returns one public agency list sorted by documented budget/spending fields.',
    ],
  },
  operations: [awardsOperation, overTimeOperation, agenciesOperation],
  endpoints: [
    { id: 'usaspending-spending-by-award', method: 'POST', urlPattern: 'https://api.usaspending.gov/api/v2/search/spending_by_award/', category: 'public-apis:government', evidenceStatus: 'confirmed', description: 'USAspending.gov advanced search awards endpoint.', observedOn: '2026-05-04', sampleSources: ['https://api.usaspending.gov/docs/endpoints', 'https://github.com/fedspendingtransparency/usaspending-api/blob/master/usaspending_api/api_contracts/contracts/v2/search/spending_by_award.md'], consumedBy: ['public-apis apis run usaspending.awards'], notes: ['No authentication required; POST JSON body uses curated date, recipient, agency, award-type, sort, and pagination controls.'] },
    { id: 'usaspending-spending-over-time', method: 'POST', urlPattern: 'https://api.usaspending.gov/api/v2/search/spending_over_time/', category: 'public-apis:government', evidenceStatus: 'confirmed', description: 'USAspending.gov spending over time aggregate endpoint.', observedOn: '2026-05-04', sampleSources: ['https://api.usaspending.gov/docs/endpoints', 'https://github.com/fedspendingtransparency/usaspending-api/blob/master/usaspending_api/api_contracts/contracts/v2/search/spending_over_time.md'], consumedBy: ['public-apis apis run usaspending.overTime'], notes: ['No authentication required; grouping curated to fiscal_year/calendar_year/quarter/month.'] },
    { id: 'usaspending-toptier-agencies', method: 'GET', urlPattern: 'https://api.usaspending.gov/api/v2/references/toptier_agencies/', category: 'public-apis:government', evidenceStatus: 'confirmed', description: 'USAspending.gov toptier agency budget authority and obligation totals.', observedOn: '2026-05-04', sampleSources: ['https://api.usaspending.gov/docs/endpoints', 'https://github.com/fedspendingtransparency/usaspending-api/blob/master/usaspending_api/api_contracts/contracts/v2/references/toptier_agencies.md'], consumedBy: ['public-apis apis run usaspending.agencies'], notes: ['No authentication required; endpoint returns one public list.'] },
  ],
}

function toUsaSpendingSharedParams(params: Record<string, unknown>): Record<string, unknown> {
  return {
    ...params,
    startDate: params.startDate ?? params['start-date'],
    endDate: params.endDate ?? params['end-date'],
    awardTypeCodes: params.awardTypeCodes ?? params['award-type-codes'],
    awardingAgency: params.awardingAgency ?? params['awarding-agency'],
  }
}
