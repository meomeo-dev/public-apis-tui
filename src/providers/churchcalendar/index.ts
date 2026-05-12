import { z } from 'zod'
import {
  getChurchCalendarDay,
  listChurchCalendarMonth,
  normalizeChurchCalendarDayInput,
  normalizeChurchCalendarMonthInput,
  type ChurchCalendarDayInput,
  type ChurchCalendarMonthInput,
} from '../../application/usecases/churchCalendar.js'
import type {
  PublicApiOperationDefinition,
  PublicApiProviderModule,
} from '../providerTypes.js'

const dayParamsSchema = z.object({
  date: z.string().min(1).optional(),
  language: z.string().min(1).optional(),
  calendar: z.string().min(1).optional(),
}) satisfies z.ZodType<ChurchCalendarDayInput>

const monthParamsSchema = z.object({
  year: z.number().int().optional(),
  month: z.number().int().optional(),
  language: z.string().min(1).optional(),
  calendar: z.string().min(1).optional(),
  limit: z.number().int().optional(),
}) satisfies z.ZodType<ChurchCalendarMonthInput>

const dayOperation: PublicApiOperationDefinition<ChurchCalendarDayInput> = {
  id: 'churchcalendar.day',
  providerId: 'churchcalendar',
  name: 'Liturgical day',
  commandPath: ['churchcalendar', 'day'],
  rpcMethod: 'churchcalendar.day',
  description: 'Fetch one Roman Catholic liturgical calendar day.',
  category: 'calendar',
  options: [
    {
      name: 'date',
      flag: '--date <YYYY-MM-DD>',
      description: 'Gregorian date, default today in UTC',
      exposure: 'primary',
      group: 'query',
      reason: 'The documented explicit date path avoids server-time shortcuts.',
      defaultValue: 'today',
    },
    {
      name: 'calendar',
      flag: '--calendar <id>',
      description: 'Calendar id, default general-en',
      exposure: 'primary',
      group: 'filters',
      reason: 'Calendar selection changes the sanctorale data set.',
      defaultValue: 'general-en',
    },
    {
      name: 'language',
      flag: '--language <cs|en|fr|it|la>',
      description: 'Response language, default en',
      exposure: 'advanced',
      group: 'filters',
      reason: 'Docs require coherent language/calendar combinations.',
      defaultValue: 'en',
    },
  ],
  paramsSchema: dayParamsSchema,
  execute: params => getChurchCalendarDay(params),
  normalizeParams: params => normalizeChurchCalendarDayInput(
    dayParamsSchema.parse(params),
  ),
  createCacheKeyParams: params => normalizeChurchCalendarDayInput(params),
  resultKind: 'churchcalendar.day',
  defaultFormat: 'text',
}

const monthOperation: PublicApiOperationDefinition<ChurchCalendarMonthInput> = {
  id: 'churchcalendar.month',
  providerId: 'churchcalendar',
  name: 'Liturgical month',
  commandPath: ['churchcalendar', 'month'],
  rpcMethod: 'churchcalendar.month',
  description: 'List Roman Catholic liturgical calendar days for a month.',
  category: 'calendar',
  options: [
    {
      name: 'year',
      flag: '--year <year>',
      description: 'Gregorian year, default current UTC year',
      exposure: 'primary',
      group: 'query',
      reason: 'The documented month route is addressed by year and month.',
      valueType: 'integer',
    },
    {
      name: 'month',
      flag: '--month <1-12>',
      description: 'Gregorian month, default current UTC month',
      exposure: 'primary',
      group: 'query',
      reason: 'The documented month route is addressed by year and month.',
      valueType: 'integer',
    },
    {
      name: 'calendar',
      flag: '--calendar <id>',
      description: 'Calendar id, default general-en',
      exposure: 'primary',
      group: 'filters',
      reason: 'Calendar selection changes the sanctorale data set.',
      defaultValue: 'general-en',
    },
    {
      name: 'language',
      flag: '--language <cs|en|fr|it|la>',
      description: 'Response language, default en',
      exposure: 'advanced',
      group: 'filters',
      reason: 'Docs require coherent language/calendar combinations.',
      defaultValue: 'en',
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: 'Days to show from the month, default 31, CLI cap 31',
      exposure: 'advanced',
      group: 'pagination',
      reason: 'A month is naturally bounded, but output still needs a cap.',
      valueType: 'integer',
      defaultValue: '31',
    },
  ],
  paramsSchema: monthParamsSchema,
  execute: params => listChurchCalendarMonth(params),
  normalizeParams: params => normalizeChurchCalendarMonthInput(
    monthParamsSchema.parse(params),
  ),
  createCacheKeyParams: params => normalizeChurchCalendarMonthInput(params),
  resultKind: 'churchcalendar.month',
  defaultFormat: 'text',
}

export const churchCalendarProvider: PublicApiProviderModule = {
  manifest: {
    id: 'churchcalendar',
    name: 'Church Calendar',
    description: 'No-auth HTTP JSON API for Roman Catholic liturgical days.',
    publicApisCategory: 'Calendar',
    homepageUrl: 'http://calapi.inadiutorium.cz/',
    docsUrl: 'http://calapi.inadiutorium.cz/api-doc',
    auth: {
      mode: 'none',
      notes: ['The documented v0 JSON endpoints require no credentials.'],
    },
    tags: ['calendar', 'liturgical-calendar', 'catholic', 'json', 'no-auth'],
    freePlanNotes: [
      'The public service uses HTTP, not HTTPS; output metadata discloses this.',
      'Calendar month output is capped at 31 days.',
    ],
  },
  operations: [dayOperation, monthOperation],
  endpoints: [
    {
      id: 'churchcalendar-day',
      method: 'GET',
      urlPattern: [
        'http://calapi.inadiutorium.cz/api/v0/{lang}/calendars/',
        '{calendar}/{year}/{month}/{day}',
      ].join(''),
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Church Calendar JSON endpoint for one liturgical day.',
      siteIds: ['public-apis-tui'],
      sampleSources: ['http://calapi.inadiutorium.cz/api-doc'],
      consumedBy: ['churchcalendar day'],
      notes: ['No authentication required.', 'HTTP-only transport.'],
    },
    {
      id: 'churchcalendar-month',
      method: 'GET',
      urlPattern: [
        'http://calapi.inadiutorium.cz/api/v0/{lang}/calendars/',
        '{calendar}/{year}/{month}',
      ].join(''),
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Church Calendar JSON endpoint for one Gregorian month.',
      siteIds: ['public-apis-tui'],
      sampleSources: ['http://calapi.inadiutorium.cz/swagger.yml'],
      consumedBy: ['churchcalendar month'],
      notes: ['No authentication required.', 'HTTP-only transport.'],
    },
  ],
}

export type {
  ChurchCalendarDayInput,
  ChurchCalendarMonthInput,
} from '../../application/usecases/churchCalendar.js'
