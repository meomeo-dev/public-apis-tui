import { z } from 'zod'
import {
  ISDAYOFF_DEFAULT_DATE_LABEL,
  ISDAYOFF_DEFAULT_DAYS,
  getIsdayoffDay,
  listIsdayoffRange,
  normalizeIsdayoffDayInput,
  normalizeIsdayoffRangeInput,
  type IsdayoffDayInput,
  type IsdayoffRangeInput,
} from '../../application/usecases/isdayoff.js'
import {
  ISDAYOFF_DEFAULT_COUNTRY,
  ISDAYOFF_MAX_RANGE_DAYS,
} from '../../infrastructure/openApis/isdayoffClient.js'
import type {
  PublicApiOperationDefinition,
  PublicApiProviderModule,
} from '../providerTypes.js'

const dayParamsSchema = z.object({
  date: z.string().optional(),
  countryCode: z.string().optional(),
  includeShortened: z.boolean().optional(),
  sixDay: z.boolean().optional(),
  markHoliday: z.boolean().optional(),
}) satisfies z.ZodType<IsdayoffDayInput>

const rangeParamsSchema = dayParamsSchema.extend({
  from: z.string().optional(),
  to: z.string().optional(),
  days: z.number().int().optional(),
}) satisfies z.ZodType<IsdayoffRangeInput>

const countryOption = {
  name: 'countryCode',
  flag: '--country-code <ru|by|kz|us|uz|tr|lv>',
  description: `Country code, default ${ISDAYOFF_DEFAULT_COUNTRY}.`,
  exposure: 'primary',
  group: 'query',
  reason: 'Restricts requests to countries listed on the official DB page.',
  valueType: 'string',
  defaultValue: ISDAYOFF_DEFAULT_COUNTRY,
} as const

const includeShortenedOption = {
  name: 'includeShortened',
  flag: '--include-shortened <true|false>',
  description: 'Mark shortened working days with provider code 2, default true.',
  exposure: 'primary',
  group: 'filters',
  reason: 'Keeps the useful documented pre=1 distinction in structured JSON.',
  valueType: 'boolean',
  defaultValue: 'true',
} as const

const sixDayOption = {
  name: 'sixDay',
  flag: '--six-day <true|false>',
  description: 'Use the documented six-day work-week calendar when available.',
  exposure: 'advanced',
  group: 'filters',
  reason: 'Useful for supported countries but not the common five-day default.',
  valueType: 'boolean',
  defaultValue: 'false',
} as const

const markHolidayOption = {
  name: 'markHoliday',
  flag: '--mark-holiday <true|false>',
  description: 'Mark holidays with provider code 8 when available.',
  exposure: 'advanced',
  group: 'filters',
  reason: 'Separates holiday labels from generic non-working days.',
  valueType: 'boolean',
  defaultValue: 'false',
} as const

const dayOperation: PublicApiOperationDefinition<IsdayoffDayInput> = {
  id: 'isdayoff.day',
  providerId: 'isdayoff',
  name: 'isDayOff day',
  commandPath: ['isdayoff', 'day'],
  rpcMethod: 'isdayoff.day',
  description: 'Check one documented isDayOff working-day status.',
  category: 'calendar',
  options: [
    {
      name: 'date',
      flag: '--date <YYYY-MM-DD>',
      description: `Gregorian date, default ${ISDAYOFF_DEFAULT_DATE_LABEL}.`,
      exposure: 'primary',
      group: 'query',
      reason: 'The documented getdata day endpoint is date-addressed.',
      valueType: 'string',
      defaultValue: ISDAYOFF_DEFAULT_DATE_LABEL,
    },
    countryOption,
    includeShortenedOption,
    sixDayOption,
    markHolidayOption,
  ],
  paramsSchema: dayParamsSchema,
  execute: params => getIsdayoffDay(params),
  normalizeParams: params => normalizeIsdayoffDayInput(
    dayParamsSchema.parse(params),
  ),
  createCacheKeyParams: params => normalizeIsdayoffDayInput(params),
  resultKind: 'isdayoff.day',
  defaultFormat: 'text',
}

const rangeOperation: PublicApiOperationDefinition<IsdayoffRangeInput> = {
  id: 'isdayoff.range',
  providerId: 'isdayoff',
  name: 'isDayOff range',
  commandPath: ['isdayoff', 'range'],
  rpcMethod: 'isdayoff.range',
  description: 'List documented isDayOff statuses for a bounded date range.',
  category: 'calendar',
  options: [
    {
      name: 'from',
      flag: '--from <YYYY-MM-DD>',
      description: `Range start date, default ${ISDAYOFF_DEFAULT_DATE_LABEL}.`,
      exposure: 'primary',
      group: 'query',
      reason: 'The documented period endpoint requires a start date.',
      valueType: 'string',
      defaultValue: ISDAYOFF_DEFAULT_DATE_LABEL,
    },
    {
      name: 'to',
      flag: '--to <YYYY-MM-DD>',
      description: 'Optional range end date; overrides --days when provided.',
      exposure: 'primary',
      group: 'query',
      reason: 'Maps to documented date2 while preserving the 366-day cap.',
      valueType: 'string',
    },
    {
      name: 'days',
      flag: '--days <count>',
      description: [
        `Range length when --to is omitted, default ${ISDAYOFF_DEFAULT_DAYS},`,
        `cap ${ISDAYOFF_MAX_RANGE_DAYS}.`,
      ].join(' '),
      exposure: 'primary',
      group: 'pagination',
      reason: 'Bounds text output, persistence, and provider period requests.',
      valueType: 'integer',
      defaultValue: String(ISDAYOFF_DEFAULT_DAYS),
    },
    countryOption,
    includeShortenedOption,
    sixDayOption,
    markHolidayOption,
  ],
  paramsSchema: rangeParamsSchema,
  execute: params => listIsdayoffRange(params),
  normalizeParams: params => normalizeIsdayoffRangeInput(
    rangeParamsSchema.parse(params),
  ),
  createCacheKeyParams: params => normalizeIsdayoffRangeInput(params),
  resultKind: 'isdayoff.range',
  defaultFormat: 'text',
}

export const isdayoffProvider: PublicApiProviderModule = {
  manifest: {
    id: 'isdayoff',
    name: 'isDayOff',
    description: [
      'No-auth working-day calendar status API returning compact text codes,',
      'projected into bounded JSON day records.',
    ].join(' '),
    publicApisCategory: 'Calendar',
    homepageUrl: 'https://www.isdayoff.ru/',
    docsUrl: 'https://www.isdayoff.ru/docs/',
    auth: {
      mode: 'none',
      notes: [
        [
          'Official docs and live probes confirm the selected getdata routes',
          'return text/plain without API keys, OAuth, cookies, account setup,',
          'or browser clickstream.',
        ].join(' '),
      ],
    },
    tags: ['calendar', 'working-days', 'holidays', 'no-auth', 'text'],
    freePlanNotes: [
      'Provider responses are compact text status codes, not JSON.',
      'Database coverage varies by country and year.',
    ],
  },
  operations: [dayOperation, rangeOperation],
  endpoints: [
    {
      id: 'isdayoff-getdata-day',
      method: 'GET',
      urlPattern: 'https://isdayoff.ru/api/getdata?*',
      category: 'public-apis:calendar',
      evidenceStatus: 'confirmed',
      observedOn: '2026-05-11',
      description: 'Documented text status endpoint for one date.',
      siteIds: ['public-apis-tui'],
      sampleSources: [
        'https://www.isdayoff.ru/docs/',
        [
          'https://isdayoff.ru/api/getdata?',
          'year=2026&month=5&day=11&cc=ru&pre=1',
        ].join(''),
      ],
      consumedBy: ['public-apis apis run isdayoff.day'],
      notes: [
        'No authentication required in live probes.',
        'CLI parses compact status text into structured JSON.',
      ],
    },
    {
      id: 'isdayoff-getdata-range',
      method: 'GET',
      urlPattern: 'https://isdayoff.ru/api/getdata?*',
      category: 'public-apis:calendar',
      evidenceStatus: 'confirmed',
      observedOn: '2026-05-11',
      description: 'Documented text status endpoint for a bounded date period.',
      siteIds: ['public-apis-tui'],
      sampleSources: [
        'https://www.isdayoff.ru/docs/',
        'https://www.isdayoff.ru/db/',
        'https://isdayoff.ru/api/getdata?year=2026&cc=ru&pre=1',
      ],
      consumedBy: ['public-apis apis run isdayoff.range'],
      notes: [
        'Official docs cap arbitrary periods at 366 days.',
        'CLI does not expose delimiter passthrough or raw text dumps.',
      ],
    },
  ],
}

export type {
  IsdayoffDayInput,
  IsdayoffRangeInput,
} from '../../application/usecases/isdayoff.js'
