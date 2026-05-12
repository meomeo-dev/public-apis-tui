import { z } from 'zod'
import { listStudioGhibliFilms, type StudioGhibliFilmsInput } from '../../application/usecases/studioGhibli.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const filmsParamsSchema = z.object({
  limit: z.number().int().optional(),
  fields: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  director: z.string().min(1).optional(),
  minScore: z.number().int().optional(),
  releaseYear: z.string().min(4).optional(),
}) satisfies z.ZodType<StudioGhibliFilmsInput>

const filmsOperation: PublicApiOperationDefinition<StudioGhibliFilmsInput> = {
  id: 'studioghibli.films',
  providerId: 'studioghibli',
  name: 'Films',
  commandPath: ['studioghibli', 'films'],
  rpcMethod: 'studioghibli.films',
  description: 'List Studio Ghibli films from the documented no-auth /films endpoint.',
  category: 'anime',
  options: [
    {
      name: 'limit',
      flag: '--limit <count>',
      description: 'Number of films to request, 1-250',
      exposure: 'primary',
      group: 'pagination',
      reason: 'Controls response size and defaults to the documented maximum to use one request efficiently.',
      valueType: 'integer',
      defaultValue: '250',
    },
    {
      name: 'title',
      flag: '--title <text>',
      description: 'Client-side title filter across English, Japanese, and romanised titles',
      exposure: 'primary',
      group: 'filters',
      reason: 'High-value terminal lookup filter; implemented client-side because the documented /films query surface only includes fields and limit.',
    },
    {
      name: 'director',
      flag: '--director <name>',
      description: 'Client-side director filter',
      exposure: 'advanced',
      group: 'filters',
      reason: 'Useful for focused exploration without overloading first-run help.',
    },
    {
      name: 'minScore',
      flag: '--min-score <score>',
      description: 'Client-side Rotten Tomatoes score floor, 0-100',
      exposure: 'advanced',
      group: 'filters',
      reason: 'Useful ranking filter for terminal browsing; safe because it is derived from documented response fields.',
      valueType: 'integer',
    },
    {
      name: 'releaseYear',
      flag: '--release-year <year>',
      description: 'Client-side four-digit release year filter',
      exposure: 'advanced',
      group: 'filters',
      reason: 'Useful documented response field filter without expanding the API request surface.',
    },
    {
      name: 'fields',
      flag: '--fields <names>',
      description: 'Comma-separated documented fields query passed through to the API',
      exposure: 'hidden',
      group: 'content',
      reason: 'Documented request parameter, but hidden from CLI UX because partial field projections can omit renderer-required fields and produce a broken terminal experience.',
    },
  ],
  paramsSchema: filmsParamsSchema,
  execute: params => listStudioGhibliFilms(params),
  normalizeParams: params => filmsParamsSchema.parse(params),
  resultKind: 'studioghibli.films',
  defaultFormat: 'text',
}

export const studioGhibliProvider: PublicApiProviderModule = {
  manifest: {
    id: 'studioghibli',
    name: 'Studio Ghibli',
    description: 'No-auth HTTPS JSON API for Studio Ghibli films and related resources.',
    publicApisCategory: 'Anime',
    homepageUrl: 'https://ghibliapi.vercel.app',
    docsUrl: 'https://ghibliapi.vercel.app/',
    auth: {
      mode: 'none',
      notes: [
        'Swagger states there is no authentication necessary for the Studio Ghibli API.',
        'The public-apis Heroku URL is stale; the current documented host is https://ghibliapi.vercel.app.',
      ],
    },
    tags: ['anime', 'films', 'studio-ghibli', 'no-auth'],
    freePlanNotes: [
      'Swagger documents default limit 50 and maximum 250 for list endpoints.',
      'No explicit rate limit is documented in the current swagger.yaml.',
    ],
  },
  operations: [filmsOperation],
  endpoints: [
    {
      id: 'studioghibli-films',
      method: 'GET',
      urlPattern: 'https://ghibliapi.vercel.app/films*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Studio Ghibli films endpoint returning film metadata JSON.',
      siteIds: ['public-apis-tui'],
      sampleSources: ['https://ghibliapi.vercel.app/swagger.yaml'],
      consumedBy: ['studioghibli films'],
      notes: ['No authentication required.', 'limit supports maximum 250.'],
    },
  ],
}
