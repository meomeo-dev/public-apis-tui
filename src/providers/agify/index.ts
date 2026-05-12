import { z } from 'zod'
import { predictAgifyAge, type AgifyAgeInput } from '../../application/usecases/agify.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const ageParamsSchema = z.object({
  name: z.string().min(1).optional(),
  countryId: z.string().min(1).optional(),
}) satisfies z.ZodType<AgifyAgeInput>

const ageOperation: PublicApiOperationDefinition<AgifyAgeInput> = {
  id: 'agify.age',
  providerId: 'agify',
  name: 'Age Prediction',
  commandPath: ['agify', 'age'],
  rpcMethod: 'agify.age',
  description: 'Estimate age distribution for a first name using Agify.io.',
  category: 'development',
  options: [
    {
      name: 'name',
      flag: '--name <name>',
      description: 'First name to estimate, default michael',
      exposure: 'primary',
      group: 'query',
      reason: 'Name is the primary documented Agify query parameter.',
      defaultValue: 'michael',
    },
    {
      name: 'countryId',
      flag: '--country-id <code>',
      description: 'Optional ISO 3166-1 alpha-2 country code, e.g. US',
      exposure: 'primary',
      group: 'filters',
      reason: 'Country filtering is documented and materially changes the estimate.',
    },
  ],
  paramsSchema: ageParamsSchema,
  execute: params => predictAgifyAge(params),
  normalizeParams: params => ageParamsSchema.parse(params),
  createCacheKeyParams: params => ({
    name: params.name ?? 'michael',
    countryId: params.countryId,
  }),
  resultKind: 'agify.age',
  defaultFormat: 'text',
}

export const agifyProvider: PublicApiProviderModule = {
  manifest: {
    id: 'agify',
    name: 'Agify.io',
    description: 'No-auth JSON API that estimates age from a first name.',
    publicApisCategory: 'Development',
    homepageUrl: 'https://agify.io/',
    docsUrl: 'https://agify.io/',
    auth: {
      mode: 'none',
      notes: ['Unauthenticated requests currently return JSON and rate-limit headers; paid/API-key plans are documented separately.'],
    },
    tags: ['development', 'demographics', 'age', 'names', 'no-auth', 'json'],
    freePlanNotes: [
      'Unauthenticated live responses expose x-rate-limit headers; observed free limit is 100 requests/day.',
      'Only curated name and country filters are exposed in CLI to avoid encouraging quota-heavy batch usage.',
    ],
  },
  operations: [ageOperation],
  endpoints: [
    {
      id: 'agify-age',
      method: 'GET',
      urlPattern: 'https://api.agify.io*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Agify.io age prediction by first name.',
      siteIds: ['public-apis-tui'],
      sampleSources: ['https://agify.io/'],
      consumedBy: ['agify age'],
      notes: ['No authentication required for current free unauthenticated usage.', 'No browser clickstream or scraping required.'],
    },
  ],
}
