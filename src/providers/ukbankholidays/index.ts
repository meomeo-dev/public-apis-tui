import { z } from 'zod'
import {
  listUkBankHolidays,
  normalizeUkBankHolidaysInput,
  type UkBankHolidaysInput,
} from '../../application/usecases/ukBankHolidays.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const eventsParamsSchema = z.object({
  division: z.string().min(1).optional(),
  year: z.number().int().optional(),
  upcoming: z.boolean().optional(),
  limit: z.number().int().optional(),
}) satisfies z.ZodType<UkBankHolidaysInput>

const eventsOperation: PublicApiOperationDefinition<UkBankHolidaysInput> = {
  id: 'ukbankholidays.events',
  providerId: 'uk-bank-holidays',
  name: 'Events',
  commandPath: ['ukbankholidays', 'events'],
  rpcMethod: 'ukbankholidays.events',
  description: 'List UK bank holidays from the GOV.UK static JSON API.',
  category: 'calendar',
  options: [
    {
      name: 'division',
      flag: '--division <england-and-wales|scotland|northern-ireland>',
      description: 'Filter by UK division',
      exposure: 'primary',
      group: 'filters',
      reason: 'GOV.UK groups events by division; filtering keeps terminal output focused.',
    },
    {
      name: 'year',
      flag: '--year <year>',
      description: 'Filter by year, default current year',
      exposure: 'primary',
      group: 'filters',
      reason: 'The static response spans multiple years, so year filtering is the main terminal narrowing control.',
      valueType: 'integer',
      defaultValue: 'current year',
    },
    {
      name: 'upcoming',
      flag: '--upcoming <true|false>',
      description: 'Show only events on or after today',
      exposure: 'advanced',
      group: 'filters',
      reason: 'Upcoming-only output is useful for operators but not part of the raw API surface.',
      valueType: 'boolean',
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: 'Events to show/cache, default 100, CLI cap 200',
      exposure: 'primary',
      group: 'pagination',
      reason: 'The API returns the full static document without server pagination; the CLI cap bounds terminal output and cache size.',
      valueType: 'integer',
      defaultValue: '100',
    },
  ],
  paramsSchema: eventsParamsSchema,
  execute: params => listUkBankHolidays(params),
  normalizeParams: params => normalizeUkBankHolidaysInput(eventsParamsSchema.parse(params)),
  createCacheKeyParams: params => normalizeUkBankHolidaysInput(params),
  resultKind: 'ukbankholidays.events',
  defaultFormat: 'text',
}

export const ukBankHolidaysProvider: PublicApiProviderModule = {
  manifest: {
    id: 'uk-bank-holidays',
    name: 'UK Bank Holidays',
    description: 'No-auth GOV.UK JSON feed for England and Wales, Scotland, and Northern Ireland bank holidays.',
    publicApisCategory: 'Calendar',
    homepageUrl: 'https://www.gov.uk/bank-holidays',
    docsUrl: 'https://www.gov.uk/bank-holidays.json',
    auth: {
      mode: 'none',
      notes: ['GOV.UK publishes a public static JSON document without API keys.'],
    },
    tags: ['calendar', 'bank-holidays', 'govuk', 'uk', 'no-auth', 'json'],
    freePlanNotes: [
      'The endpoint returns a full static JSON document; there is no page-size parameter to maximize.',
      'CLI defaults to 100 events and caps at 200 to cover the current per-division data while bounding output.',
    ],
  },
  operations: [eventsOperation],
  endpoints: [
    {
      id: 'uk-bank-holidays-json',
      method: 'GET',
      urlPattern: 'https://www.gov.uk/bank-holidays.json',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'GOV.UK bank holidays static JSON document.',
      siteIds: ['public-apis-tui'],
      sampleSources: ['https://www.gov.uk/bank-holidays.json'],
      consumedBy: ['ukbankholidays events'],
      notes: ['No authentication required.', 'No browser clickstream or scraping required.'],
    },
  ],
}
