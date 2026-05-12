import { z } from 'zod'
import { predictGenderize, type GenderizePredictInput } from '../../application/usecases/genderize.js'
import { normalizeGenderizeQuery } from '../../infrastructure/openApis/genderizeClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const predictParamsSchema = z.object({
  name: z.string().optional(),
  countryId: z.string().optional(),
}) satisfies z.ZodType<GenderizePredictInput>

const predictOperation: PublicApiOperationDefinition<GenderizePredictInput> = {
  id: 'genderize.predict',
  providerId: 'genderize',
  name: 'Predict Gender',
  commandPath: ['genderize', 'predict'],
  rpcMethod: 'genderize.predict',
  description: 'Estimate likely gender distribution for a first name through Genderize.io.',
  category: 'development',
  options: [
    {
      name: 'name',
      flag: '--name <name>',
      description: 'First name to analyze, default michael',
      exposure: 'primary',
      group: 'query',
      reason: 'The name is the required upstream query and primary user intent.',
      defaultValue: 'michael',
    },
    {
      name: 'countryId',
      flag: '--country-id <code>',
      description: 'Optional ISO 3166-1 alpha-2 country filter',
      exposure: 'primary',
      group: 'filters',
      reason: 'Genderize supports country-specific distributions; exposing it materially changes the result while staying simple.',
    },
  ],
  paramsSchema: predictParamsSchema,
  execute: params => predictGenderize(params),
  normalizeParams: params => predictParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeGenderizeQuery(params),
  resultKind: 'genderize.predict',
  defaultFormat: 'text',
}

export const genderizeProvider: PublicApiProviderModule = {
  manifest: {
    id: 'genderize',
    name: 'Genderize.io',
    description: 'No-auth HTTPS JSON API that estimates likely gender distribution from a first name.',
    publicApisCategory: 'Development',
    homepageUrl: 'https://genderize.io',
    docsUrl: 'https://genderize.io/',
    auth: {
      mode: 'none',
      notes: ['Free unauthenticated usage is available; API keys are only needed for paid higher-volume plans.'],
    },
    tags: ['development', 'data-enrichment', 'names', 'gender', 'no-auth', 'json'],
    freePlanNotes: [
      'Live unauthenticated responses expose a 100 requests/day rate-limit header.',
      'Batch queries are documented, but this CLI exposes only one name per command to preserve free quota and keep cache keys compact.',
    ],
  },
  operations: [predictOperation],
  endpoints: [
    {
      id: 'genderize-predict',
      method: 'GET',
      urlPattern: 'https://api.genderize.io*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Genderize.io first-name gender prediction endpoint.',
      siteIds: ['public-apis-tui'],
      sampleSources: ['https://genderize.io/', 'https://api.genderize.io?name=michael'],
      consumedBy: ['genderize predict'],
      notes: ['No authentication required for the free public endpoint; no browser clickstream or scraping required.'],
    },
  ],
}
