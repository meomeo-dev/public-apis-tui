import { z } from 'zod'
import { predictNationalize, type NationalizePredictInput } from '../../application/usecases/nationalize.js'
import { normalizeNationalizeQuery } from '../../infrastructure/openApis/nationalizeClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const predictParamsSchema = z.object({
  name: z.string().optional(),
}) satisfies z.ZodType<NationalizePredictInput>

const predictOperation: PublicApiOperationDefinition<NationalizePredictInput> = {
  id: 'nationalize.predict',
  providerId: 'nationalize',
  name: 'Nationality Prediction',
  commandPath: ['nationalize', 'predict'],
  rpcMethod: 'nationalize.predict',
  description: 'Estimate likely nationalities for a first or last name using Nationalize.io.',
  category: 'development',
  options: [
    {
      name: 'name',
      flag: '--name <name>',
      description: 'Name to estimate, default michael',
      exposure: 'primary',
      group: 'query',
      reason: 'Name is the primary documented Nationalize query parameter.',
      defaultValue: 'michael',
    },
  ],
  paramsSchema: predictParamsSchema,
  execute: params => predictNationalize(params),
  normalizeParams: params => predictParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeNationalizeQuery(params),
  resultKind: 'nationalize.predict',
  defaultFormat: 'text',
}

export const nationalizeProvider: PublicApiProviderModule = {
  manifest: {
    id: 'nationalize',
    name: 'Nationalize.io',
    description: 'No-auth HTTPS JSON API estimating likely nationalities from names.',
    publicApisCategory: 'Development',
    homepageUrl: 'https://nationalize.io',
    docsUrl: 'https://nationalize.io',
    auth: {
      mode: 'none',
      notes: ['Single-name prediction endpoint requires no API key, OAuth, cookies, browser session, or account setup.'],
    },
    tags: ['development', 'demographics', 'nationality', 'prediction', 'commercial-analysis', 'no-auth', 'json'],
    freePlanNotes: [
      'Official pricing metadata advertises 2,500 names/month on the free plan.',
      'Live unauthenticated responses expose x-rate-limit headers with a 100 request window.',
      'Batch name[] requests are supported but intentionally not exposed in the first pass to conserve free quota and keep cache keys compact.',
    ],
  },
  operations: [predictOperation],
  endpoints: [
    {
      id: 'nationalize-predict',
      method: 'GET',
      urlPattern: 'https://api.nationalize.io/*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Nationalize.io no-auth name-to-nationality prediction endpoint.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-04',
      sampleSources: ['https://nationalize.io', 'https://api.nationalize.io/?name=nathaniel'],
      consumedBy: ['nationalize predict'],
      notes: ['No authentication required; no browser clickstream or scraping required.', 'Batch name[] support is intentionally not exposed in CLI first pass.'],
    },
  ],
}
