import { z } from 'zod'
import { getUkCarbonGeneration, getUkCarbonIntensity } from '../../application/usecases/ukCarbonIntensity.js'
import {
  normalizeUkCarbonCurrentInput,
  normalizeUkCarbonGenerationInput,
  type UkCarbonIntensityCurrentInput,
  type UkCarbonIntensityGenerationInput,
} from '../../infrastructure/openApis/ukCarbonIntensityClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const currentParamsSchema = z.object({}) satisfies z.ZodType<UkCarbonIntensityCurrentInput>
const generationParamsSchema = z.object({}) satisfies z.ZodType<UkCarbonIntensityGenerationInput>

const currentOperation: PublicApiOperationDefinition<UkCarbonIntensityCurrentInput> = {
  id: 'ukcarbonintensity.intensity',
  providerId: 'ukcarbonintensity',
  name: 'Current Carbon Intensity',
  commandPath: ['ukcarbonintensity', 'intensity'],
  rpcMethod: 'ukcarbonintensity.intensity',
  description: 'Read the current official Great Britain carbon intensity forecast and actual value.',
  category: 'environment',
  options: [
    {
      name: 'currentWindow',
      flag: '--current-window',
      description: 'Hidden fixed latest half-hour window selector',
      exposure: 'hidden',
      group: 'query',
      reason: 'The documented current /intensity endpoint has no user-tunable query parameters; hidden metadata records the intentional UX decision.',
      valueType: 'boolean',
    },
  ],
  paramsSchema: currentParamsSchema,
  execute: params => getUkCarbonIntensity(params),
  normalizeParams: params => currentParamsSchema.parse(params),
  createCacheKeyParams: () => normalizeUkCarbonCurrentInput(),
  resultKind: 'ukcarbonintensity.intensity',
  defaultFormat: 'text',
}

const generationOperation: PublicApiOperationDefinition<UkCarbonIntensityGenerationInput> = {
  id: 'ukcarbonintensity.generation',
  providerId: 'ukcarbonintensity',
  name: 'Current Generation Mix',
  commandPath: ['ukcarbonintensity', 'generation'],
  rpcMethod: 'ukcarbonintensity.generation',
  description: 'Read the current Great Britain generation mix percentages by fuel type.',
  category: 'environment',
  options: [
    {
      name: 'currentWindow',
      flag: '--current-window',
      description: 'Hidden fixed latest half-hour window selector',
      exposure: 'hidden',
      group: 'query',
      reason: 'The documented current /generation endpoint has no user-tunable query parameters; hidden metadata records the intentional UX decision.',
      valueType: 'boolean',
    },
  ],
  paramsSchema: generationParamsSchema,
  execute: params => getUkCarbonGeneration(params),
  normalizeParams: params => generationParamsSchema.parse(params),
  createCacheKeyParams: () => normalizeUkCarbonGenerationInput(),
  resultKind: 'ukcarbonintensity.generation',
  defaultFormat: 'text',
}

export const ukCarbonIntensityProvider: PublicApiProviderModule = {
  manifest: {
    id: 'ukcarbonintensity',
    name: 'UK Carbon Intensity',
    description: 'Official no-auth HTTPS JSON API for Great Britain carbon intensity and electricity generation mix.',
    publicApisCategory: 'Environment',
    homepageUrl: 'https://carbon-intensity.github.io/api-definitions/',
    docsUrl: 'https://carbon-intensity.github.io/api-definitions/',
    auth: {
      mode: 'none',
      notes: ['Official API reference marks implemented operations as not requiring authentication.'],
    },
    tags: ['environment', 'energy', 'carbon', 'electricity', 'great-britain', 'commercial-analysis', 'no-auth', 'json'],
    freePlanNotes: [
      'Official API reference exposes current /intensity and /generation endpoints without API keys.',
      'No documented page-size parameter applies to these current snapshot endpoints; each returns the latest half-hour window.',
    ],
  },
  operations: [currentOperation, generationOperation],
  endpoints: [
    {
      id: 'uk-carbon-intensity-current',
      method: 'GET',
      urlPattern: 'https://api.carbonintensity.org.uk/intensity',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Official current Great Britain carbon intensity endpoint.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-04',
      sampleSources: [
        'https://carbon-intensity.github.io/api-definitions/#get-intensity',
        'https://api.carbonintensity.org.uk/intensity',
      ],
      consumedBy: ['ukcarbonintensity intensity'],
      notes: ['No authentication required.', 'No browser clickstream or scraping required.'],
    },
    {
      id: 'uk-carbon-intensity-generation',
      method: 'GET',
      urlPattern: 'https://api.carbonintensity.org.uk/generation',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Official current Great Britain generation mix endpoint.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-04',
      sampleSources: [
        'https://carbon-intensity.github.io/api-definitions/#get-generation',
        'https://api.carbonintensity.org.uk/generation',
      ],
      consumedBy: ['ukcarbonintensity generation'],
      notes: ['No authentication required.', 'No browser clickstream or scraping required.'],
    },
  ],
}
