import { z } from 'zod'
import {
  getNamedaysByDate,
  normalizeNamedaysDateInput,
  normalizeNamedaysNameInput,
  searchNamedaysByName,
  type NamedaysDateInput,
  type NamedaysNameInput,
} from '../../application/usecases/namedays.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const dateParamsSchema = z.object({
  day: z.number().int().optional(),
  month: z.number().int().optional(),
  country: z.string().min(1).optional(),
  limit: z.number().int().optional(),
}) satisfies z.ZodType<NamedaysDateInput>

const nameParamsSchema = z.object({
  name: z.string().min(1).optional(),
  country: z.string().min(1).optional(),
  limit: z.number().int().optional(),
}) satisfies z.ZodType<NamedaysNameInput>

const dateOperation: PublicApiOperationDefinition<NamedaysDateInput> = {
  id: 'namedays.date',
  providerId: 'namedays',
  name: 'Namedays By Date',
  commandPath: ['namedays', 'date'],
  rpcMethod: 'namedays.date',
  description: 'Fetch namedays for a month/day across supported countries using Namedays Calendar V2.',
  category: 'calendar',
  options: [
    {
      name: 'day',
      flag: '--day <number>',
      description: 'Day of month 1-31, default today',
      exposure: 'primary',
      group: 'query',
      reason: 'The documented date endpoint requires day and month, but a terminal-friendly default should open today first.',
      valueType: 'integer',
    },
    {
      name: 'month',
      flag: '--month <number>',
      description: 'Month number 1-12, default current month',
      exposure: 'primary',
      group: 'query',
      reason: 'The documented date endpoint requires day and month, but a terminal-friendly default should open today first.',
      valueType: 'integer',
    },
    {
      name: 'country',
      flag: '--country <code>',
      description: 'Filter two-letter country code from response, for example us',
      exposure: 'primary',
      group: 'filters',
      reason: 'The response is country-keyed; country filtering is a primary terminal narrowing task.',
      defaultValue: '',
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: 'Country rows to show/cache, default 30, CLI cap 30',
      exposure: 'primary',
      group: 'pagination',
      reason: 'The endpoint returns all countries in one object, so CLI caps projection/cache to the current supported-country scale.',
      valueType: 'integer',
      defaultValue: '30',
    },
  ],
  paramsSchema: dateParamsSchema,
  execute: params => getNamedaysByDate(params),
  normalizeParams: params => normalizeNamedaysDateInput(dateParamsSchema.parse(params)),
  createCacheKeyParams: params => normalizeNamedaysDateInput(params),
  resultKind: 'namedays.date',
  defaultFormat: 'text',
}

const nameOperation: PublicApiOperationDefinition<NamedaysNameInput> = {
  id: 'namedays.name',
  providerId: 'namedays',
  name: 'Namedays By Name',
  commandPath: ['namedays', 'name'],
  rpcMethod: 'namedays.name',
  description: 'Search Namedays Calendar V2 for dates/countries matching one name.',
  category: 'calendar',
  options: [
    {
      name: 'name',
      flag: '--name <text>',
      description: 'Name to search, 2-15 chars, default John',
      exposure: 'primary',
      group: 'query',
      reason: 'The documented name endpoint is centered on a required name body field.',
      defaultValue: 'John',
    },
    {
      name: 'country',
      flag: '--country <code>',
      description: 'Filter two-letter country code from response, for example us',
      exposure: 'primary',
      group: 'filters',
      reason: 'Name search can return multiple countries; country filtering keeps terminal output focused.',
      defaultValue: '',
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: 'Matches to show/cache, default 20, CLI cap 50',
      exposure: 'primary',
      group: 'pagination',
      reason: 'Name search may return multiple dated matches; limit bounds output/cache.',
      valueType: 'integer',
      defaultValue: '20',
    },
  ],
  paramsSchema: nameParamsSchema,
  execute: params => searchNamedaysByName(params),
  normalizeParams: params => normalizeNamedaysNameInput(nameParamsSchema.parse(params)),
  createCacheKeyParams: params => normalizeNamedaysNameInput(params),
  resultKind: 'namedays.name',
  defaultFormat: 'text',
}

export const namedaysProvider: PublicApiProviderModule = {
  manifest: {
    id: 'namedays',
    name: 'Namedays Calendar',
    description: 'No-auth HTTPS JSON API for namedays across multiple countries.',
    publicApisCategory: 'Calendar',
    homepageUrl: 'https://nameday.abalin.net/',
    docsUrl: 'https://nameday.abalin.net/docs/api',
    auth: {
      mode: 'none',
      notes: ['Official V2 OpenAPI docs expose public endpoints without API keys.'],
    },
    tags: ['calendar', 'namedays', 'countries', 'no-auth', 'json'],
    freePlanNotes: [
      'Docs do not publish a finite rate limit; live e2e keeps request count low and cacheable.',
      'V1-style routes currently return 404; provider uses documented V2 endpoints only.',
    ],
  },
  operations: [dateOperation, nameOperation],
  endpoints: [
    {
      id: 'namedays-v2-date',
      method: 'GET',
      urlPattern: 'https://nameday.abalin.net/api/V2/date*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Namedays Calendar V2 namedays by specific day/month.',
      siteIds: ['public-apis-tui'],
      sampleSources: ['https://nameday.abalin.net/docs/api'],
      consumedBy: ['namedays date'],
      notes: ['No authentication required.'],
    },
    {
      id: 'namedays-v2-getname',
      method: 'POST',
      urlPattern: 'https://nameday.abalin.net/api/V2/getname',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Namedays Calendar V2 search namedays by name.',
      siteIds: ['public-apis-tui'],
      sampleSources: ['https://nameday.abalin.net/docs/api'],
      consumedBy: ['namedays name'],
      notes: ['No authentication required.'],
    },
  ],
}
