import { z } from 'zod'
import {
  ICSDB_DEFAULT_LIMIT,
  ICSDB_DEFAULT_LOCALE,
  ICSDB_DEFAULT_SLUG,
  ICSDB_MAX_LIMIT,
  getIcsdbEvents,
  listIcsdbCalendars,
  normalizeIcsdbCalendarsInput,
  normalizeIcsdbEventsInput,
  type IcsdbCalendarsInput,
  type IcsdbEventsInput,
} from '../../application/usecases/icsdb.js'
import type {
  PublicApiOperationDefinition,
  PublicApiProviderModule,
} from '../providerTypes.js'

const calendarsParamsSchema = z.object({
  locale: z.string().optional(),
  query: z.string().optional(),
  limit: z.number().int().optional(),
}) satisfies z.ZodType<IcsdbCalendarsInput>

const eventsParamsSchema = z.object({
  locale: z.string().optional(),
  slug: z.string().optional(),
  query: z.string().optional(),
  limit: z.number().int().optional(),
}) satisfies z.ZodType<IcsdbEventsInput>

const localeOption = {
  name: 'locale',
  flag: '--locale <en-US|fr-FR>',
  description: `Build output locale, default ${ICSDB_DEFAULT_LOCALE}.`,
  exposure: 'primary',
  group: 'filters',
  reason: 'Restricts discovery to documented build locale folders.',
  valueType: 'string',
  defaultValue: ICSDB_DEFAULT_LOCALE,
} as const

const queryOption = {
  name: 'query',
  flag: '--query <text>',
  description: 'Optional local filter for slug/title or event summary/category.',
  exposure: 'primary',
  group: 'filters',
  reason: 'Filters already fetched bounded metadata locally without new routes.',
  valueType: 'string',
} as const

const limitOption = {
  name: 'limit',
  flag: '--limit <count>',
  description: `Maximum rows to show, 1-${ICSDB_MAX_LIMIT}.`,
  exposure: 'primary',
  group: 'pagination',
  reason: 'Bounds terminal output and persisted payload size.',
  valueType: 'integer',
  defaultValue: String(ICSDB_DEFAULT_LIMIT),
} as const

const calendarsOperation: PublicApiOperationDefinition<IcsdbCalendarsInput> = {
  id: 'icsdb.calendars',
  providerId: 'icsdb',
  name: 'icsdb calendars',
  commandPath: ['icsdb', 'calendars'],
  rpcMethod: 'icsdb.calendars',
  description: 'List generated non-working-day ICS calendars from build/.',
  category: 'calendar',
  options: [localeOption, queryOption, limitOption],
  paramsSchema: calendarsParamsSchema,
  execute: params => listIcsdbCalendars(params),
  normalizeParams: params => normalizeIcsdbCalendarsInput(
    calendarsParamsSchema.parse(params),
  ),
  createCacheKeyParams: params => normalizeIcsdbCalendarsInput(params),
  resultKind: 'icsdb.calendars',
  defaultFormat: 'text',
}

const eventsOperation: PublicApiOperationDefinition<IcsdbEventsInput> = {
  id: 'icsdb.events',
  providerId: 'icsdb',
  name: 'icsdb events',
  commandPath: ['icsdb', 'events'],
  rpcMethod: 'icsdb.events',
  description: 'Parse one generated non-working-day ICS calendar into JSON.',
  category: 'calendar',
  options: [
    localeOption,
    {
      name: 'slug',
      flag: '--slug <slug>',
      description: [
        `Calendar slug such as ${ICSDB_DEFAULT_SLUG}, france,`,
        'germany-all, or uk-england-wales.',
      ].join(' '),
      exposure: 'primary',
      group: 'query',
      reason: [
        'Maps to a fixed build/{locale}/{slug}-nonworkingdays.ics raw path',
        'while rejecting paths, URLs, and file extensions.',
      ].join(' '),
      valueType: 'string',
      defaultValue: ICSDB_DEFAULT_SLUG,
    },
    queryOption,
    limitOption,
  ],
  paramsSchema: eventsParamsSchema,
  execute: params => getIcsdbEvents(params),
  normalizeParams: params => normalizeIcsdbEventsInput(
    eventsParamsSchema.parse(params),
  ),
  createCacheKeyParams: params => normalizeIcsdbEventsInput(params),
  resultKind: 'icsdb.events',
  defaultFormat: 'text',
}

export const icsdbProvider: PublicApiProviderModule = {
  manifest: {
    id: 'icsdb',
    name: 'icsdb Non-Working Days',
    description: [
      'No-auth GitHub-hosted static ICS calendars for non-working days,',
      'projected into bounded JSON event metadata.',
    ].join(' '),
    publicApisCategory: 'Calendar',
    homepageUrl: 'https://github.com/gadael/icsdb',
    docsUrl: 'https://github.com/gadael/icsdb',
    auth: {
      mode: 'none',
      notes: [
        [
          'Official README and live probes confirm generated build ICS files',
          'are readable through GitHub raw URLs without API keys, OAuth,',
          'cookies, account setup, or browser flow.',
        ].join(' '),
      ],
    },
    tags: ['calendar', 'holidays', 'non-working-days', 'ics', 'no-auth'],
    freePlanNotes: [
      'GitHub API unauthenticated requests have public rate limits.',
      [
        'Repository files are static and historically generated; validate',
        'holiday-critical decisions against official local sources.',
      ].join(' '),
    ],
  },
  operations: [calendarsOperation, eventsOperation],
  endpoints: [
    {
      id: 'icsdb-github-tree',
      method: 'GET',
      urlPattern:
        'https://api.github.com/repos/gadael/icsdb/git/trees/master*',
      category: 'public-apis:calendar',
      evidenceStatus: 'confirmed',
      observedOn: '2026-05-11',
      description: 'GitHub tree API used to discover generated build ICS files.',
      siteIds: ['public-apis-tui'],
      sampleSources: [
        'https://github.com/gadael/icsdb',
        'https://api.github.com/repos/gadael/icsdb/git/trees/master?recursive=1',
      ],
      consumedBy: ['public-apis apis run icsdb.calendars'],
      notes: [
        'No authentication required in live probes.',
        'CLI filters only build/en-US and build/fr-FR *.ics files.',
      ],
    },
    {
      id: 'icsdb-raw-build-ics',
      method: 'GET',
      urlPattern: String.raw`regex:^https://raw\.githubusercontent\.com/` +
        String.raw`gadael/icsdb/master/build/(?:en-US|fr-FR)/` +
        String.raw`[a-z0-9% -]+-nonworkingdays\.ics$`,
      category: 'public-apis:calendar',
      evidenceStatus: 'confirmed',
      observedOn: '2026-05-11',
      description: 'Generated raw ICS calendar file from the official build folder.',
      siteIds: ['public-apis-tui'],
      sampleSources: [
        'https://raw.githubusercontent.com/gadael/icsdb/master/README.md',
        'https://raw.githubusercontent.com/gadael/icsdb/master/build/README.md',
        [
          'https://raw.githubusercontent.com/gadael/icsdb/master/build/',
          'en-US/us-all-nonworkingdays.ics',
        ].join(''),
      ],
      consumedBy: ['public-apis apis run icsdb.events'],
      notes: [
        'No authentication required in live probes.',
        'CLI parses VEVENT fields into bounded JSON and does not dump raw ICS.',
      ],
    },
  ],
}

export type {
  IcsdbCalendarsInput,
  IcsdbEventsInput,
} from '../../application/usecases/icsdb.js'
