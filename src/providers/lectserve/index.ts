import { z } from 'zod'
import {
  LECTSERVE_DEFAULT_LECTIONARY,
  getLectServeDate,
  getLectServeSunday,
  normalizeLectServeDateInput,
  normalizeLectServeSundayInput,
  type LectServeDateInput,
  type LectServeSundayInput,
} from '../../application/usecases/lectServe.js'
import type {
  PublicApiOperationDefinition,
  PublicApiProviderModule,
} from '../providerTypes.js'

const dateParamsSchema = z.object({
  date: z.string().optional(),
  lectionary: z.string().optional(),
}) satisfies z.ZodType<LectServeDateInput>

const sundayParamsSchema = z.object({
  lectionary: z.string().optional(),
}) satisfies z.ZodType<LectServeSundayInput>

const dateOperation: PublicApiOperationDefinition<LectServeDateInput> = {
  id: 'lectserve.date',
  providerId: 'lectserve',
  name: 'Lectionary date',
  commandPath: ['lectserve', 'date'],
  rpcMethod: 'lectserve.date',
  description: 'Fetch LectServe daily and Sunday lectionary readings by date.',
  category: 'calendar',
  options: [
    {
      name: 'date',
      flag: '--date <YYYY-MM-DD>',
      description: 'Gregorian date, default current UTC date.',
      exposure: 'primary',
      group: 'query',
      reason: 'Uses the documented /date/yyyy-mm-dd route explicitly.',
      valueType: 'string',
    },
    {
      name: 'lectionary',
      flag: '--lectionary <acna|rcl>',
      description: `Sunday/red-letter lectionary, default ${LECTSERVE_DEFAULT_LECTIONARY}.`,
      exposure: 'primary',
      group: 'filters',
      reason: 'Maps to the documented optional lect query parameter.',
      valueType: 'string',
      defaultValue: LECTSERVE_DEFAULT_LECTIONARY,
    },
  ],
  paramsSchema: dateParamsSchema,
  execute: params => getLectServeDate(params),
  normalizeParams: params => normalizeLectServeDateInput(
    dateParamsSchema.parse(params),
  ),
  createCacheKeyParams: params => normalizeLectServeDateInput(params),
  resultKind: 'lectserve.date',
  defaultFormat: 'text',
}

const sundayOperation: PublicApiOperationDefinition<LectServeSundayInput> = {
  id: 'lectserve.sunday',
  providerId: 'lectserve',
  name: 'Upcoming Sunday lectionary',
  commandPath: ['lectserve', 'sunday'],
  rpcMethod: 'lectserve.sunday',
  description: 'Fetch the LectServe upcoming Sunday lectionary payload.',
  category: 'calendar',
  options: [
    {
      name: 'lectionary',
      flag: '--lectionary <acna|rcl>',
      description: `Sunday lectionary, default ${LECTSERVE_DEFAULT_LECTIONARY}.`,
      exposure: 'primary',
      group: 'filters',
      reason: 'Maps to the documented optional lect query parameter.',
      valueType: 'string',
      defaultValue: LECTSERVE_DEFAULT_LECTIONARY,
    },
  ],
  paramsSchema: sundayParamsSchema,
  execute: params => getLectServeSunday(params),
  normalizeParams: params => normalizeLectServeSundayInput(
    sundayParamsSchema.parse(params),
  ),
  createCacheKeyParams: params => normalizeLectServeSundayInput(params),
  resultKind: 'lectserve.sunday',
  defaultFormat: 'text',
}

export const lectServeProvider: PublicApiProviderModule = {
  manifest: {
    id: 'lectserve',
    name: 'LectServe',
    description: [
      'No-auth HTTPS JSON API for ACNA and Revised Common Lectionary',
      'readings by explicit date and upcoming Sunday.',
    ].join(' '),
    publicApisCategory: 'Calendar',
    homepageUrl: 'https://www.lectserve.com/',
    docsUrl: 'https://www.lectserve.com/api',
    auth: {
      mode: 'none',
      notes: ['The documented JSON endpoints require no credentials.'],
    },
    tags: ['calendar', 'lectionary', 'acna', 'rcl', 'json', 'no-auth'],
    freePlanNotes: [
      'Official docs describe the service as alpha quality.',
      'The CLI avoids the server-time /today shortcut and uses explicit dates.',
    ],
  },
  operations: [dateOperation, sundayOperation],
  endpoints: [
    {
      id: 'lectserve-date',
      method: 'GET',
      urlPattern: 'https://www.lectserve.com/date/{yyyy-mm-dd}',
      category: 'public-apis:calendar',
      evidenceStatus: 'confirmed',
      observedOn: '2026-05-11',
      description: 'LectServe JSON payload for one explicit Gregorian date.',
      siteIds: ['public-apis-tui'],
      sampleSources: [
        'https://www.lectserve.com/api',
        'https://www.lectserve.com/date/2026-05-10',
      ],
      consumedBy: ['public-apis apis run lectserve.date'],
      notes: [
        'No authentication required in live probes.',
        'Optional lect=acna or lect=rcl is exposed as --lectionary.',
      ],
    },
    {
      id: 'lectserve-sunday',
      method: 'GET',
      urlPattern: 'https://www.lectserve.com/sunday',
      category: 'public-apis:calendar',
      evidenceStatus: 'confirmed',
      observedOn: '2026-05-11',
      description: 'LectServe JSON payload for the upcoming Sunday.',
      siteIds: ['public-apis-tui'],
      sampleSources: [
        'https://www.lectserve.com/api',
        'https://www.lectserve.com/sunday',
      ],
      consumedBy: ['public-apis apis run lectserve.sunday'],
      notes: [
        'No authentication required in live probes.',
        'Server-relative upcoming Sunday route; date-specific Sunday routes are',
        'not documented and are not exposed.',
      ],
    },
  ],
}

export type {
  LectServeDateInput,
  LectServeSundayInput,
} from '../../application/usecases/lectServe.js'
