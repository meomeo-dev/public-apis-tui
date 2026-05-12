import { z } from 'zod'
import {
  listArtInstituteChicagoArtworks,
  type ArtInstituteChicagoArtworksInput,
} from '../../application/usecases/artInstituteChicago.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const artworksParamsSchema = z.object({
  query: z.string().min(1).optional(),
  limit: z.number().int().optional(),
  page: z.number().int().optional(),
  fields: z.string().min(1).optional(),
}) satisfies z.ZodType<ArtInstituteChicagoArtworksInput>

const artworksOperation: PublicApiOperationDefinition<ArtInstituteChicagoArtworksInput> = {
  id: 'artic.artworks',
  providerId: 'artic',
  name: 'Artworks',
  commandPath: ['artic', 'artworks'],
  rpcMethod: 'artic.artworks',
  description: 'Search or browse Art Institute of Chicago artworks through the no-auth REST API.',
  category: 'art-design',
  options: [
    {
      name: 'query',
      flag: '--query <text>',
      description: 'Search text; omitted value browses /artworks instead of /artworks/search',
      exposure: 'primary',
      group: 'query',
      reason: 'Primary discovery affordance for a museum collection CLI.',
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: 'Number of artworks to request, 1-100; default 100',
      exposure: 'primary',
      group: 'pagination',
      reason: 'Controls response size; default uses the CLI cap because no finite provider max was found in docs.',
      valueType: 'integer',
      defaultValue: '100',
    },
    {
      name: 'page',
      flag: '--page <number>',
      description: 'Result page number, starting at 1',
      exposure: 'advanced',
      group: 'pagination',
      reason: 'Useful after an initial query but secondary to search text and page size.',
      valueType: 'integer',
      defaultValue: '1',
    },
    {
      name: 'fields',
      flag: '--fields <names>',
      description: 'Comma-separated ArtIC fields to request',
      exposure: 'hidden',
      group: 'content',
      reason: 'Documented content-shaping parameter, but hidden from CLI UX because partial projections can omit renderer-required fields and produce a broken terminal experience.',
      defaultValue: 'id,title,artist_display,date_display,image_id,is_public_domain',
    },
  ],
  paramsSchema: artworksParamsSchema,
  execute: params => listArtInstituteChicagoArtworks(params),
  normalizeParams: params => artworksParamsSchema.parse(params),
  resultKind: 'artic.artworks',
  defaultFormat: 'text',
}

export const articProvider: PublicApiProviderModule = {
  manifest: {
    id: 'artic',
    name: 'Art Institute of Chicago',
    description: 'No-auth HTTPS JSON API for Art Institute of Chicago collection metadata.',
    publicApisCategory: 'Art & Design',
    homepageUrl: 'https://www.artic.edu',
    docsUrl: 'https://api.artic.edu/docs/',
    auth: {
      mode: 'none',
      notes: [
        'Official API docs expose public GET endpoints without an API key.',
        'Client sends the documented AIC-User-Agent contact header for API identification.',
      ],
    },
    tags: ['art', 'museum', 'collection', 'iiif', 'no-auth'],
    freePlanNotes: [
      'No explicit rate limit found in official docs during 2026-05-03 research.',
      'No finite maximum limit was found; CLI caps interactive requests at 100.',
    ],
  },
  operations: [artworksOperation],
  endpoints: [
    {
      id: 'artic-artworks',
      method: 'GET',
      urlPattern: 'https://api.artic.edu/api/v1/artworks*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Art Institute of Chicago artworks collection endpoint returning paginated artwork metadata JSON.',
      siteIds: ['public-apis-tui'],
      sampleSources: ['https://api.artic.edu/docs/', 'https://api.artic.edu/api/v1/openapi.json'],
      consumedBy: ['artic artworks'],
      notes: ['No authentication required.', 'Uses AIC-User-Agent header.', 'Supports fields, limit, and page query parameters.'],
    },
    {
      id: 'artic-artworks-search',
      method: 'GET',
      urlPattern: 'https://api.artic.edu/api/v1/artworks/search*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Art Institute of Chicago artwork search endpoint returning paginated search results.',
      siteIds: ['public-apis-tui'],
      sampleSources: ['https://api.artic.edu/docs/', 'https://api.artic.edu/api/v1/openapi.json'],
      consumedBy: ['artic artworks'],
      notes: ['No authentication required.', 'The --query CLI option routes to this endpoint.', 'Search rows include _score when returned by the API.'],
    },
  ],
}
