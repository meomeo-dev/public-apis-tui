import { z } from 'zod'
import { listHashnodePosts } from '../../application/usecases/hashnode.js'
import { HASHNODE_DEFAULT_FIRST, HASHNODE_DEFAULT_HOST, normalizeHashnodePostsInput, type HashnodePostsInput } from '../../infrastructure/openApis/hashnodeClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const postsParamsSchema = z.object({
  host: z.string().min(1).optional(),
  first: z.coerce.number().optional(),
  after: z.string().min(1).optional(),
}) satisfies z.ZodType<HashnodePostsInput>

const postsOperation: PublicApiOperationDefinition<HashnodePostsInput> = {
  id: 'hashnode.posts',
  providerId: 'hashnode',
  name: 'Publication Posts',
  commandPath: ['hashnode', 'posts'],
  rpcMethod: 'hashnode.posts',
  description: 'List public Hashnode publication posts through the no-auth GraphQL API.',
  category: 'social',
  options: [
    { name: 'host', flag: '--host <host>', description: `Publication host, default ${HASHNODE_DEFAULT_HOST}`, exposure: 'primary', group: 'query', reason: 'Host identifies the public publication to inspect.', defaultValue: HASHNODE_DEFAULT_HOST },
    { name: 'first', flag: '--first <count>', description: `Posts to return, default/cap ${HASHNODE_DEFAULT_FIRST}`, exposure: 'primary', group: 'pagination', reason: 'No public maximum is documented; bounded for readable terminal output.', valueType: 'integer', defaultValue: String(HASHNODE_DEFAULT_FIRST) },
    { name: 'after', flag: '--after <cursor>', description: 'Opaque endCursor from a previous response', exposure: 'advanced', group: 'pagination', reason: 'Needed to continue paginated publication posts.', defaultValue: undefined },
  ],
  paramsSchema: postsParamsSchema,
  execute: params => listHashnodePosts(params),
  normalizeParams: params => postsParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeHashnodePostsInput(params),
  resultKind: 'hashnode.posts',
  defaultFormat: 'text',
}

export const hashnodeProvider: PublicApiProviderModule = {
  manifest: {
    id: 'hashnode',
    name: 'Hashnode',
    description: 'No-auth public Hashnode publication posts via GraphQL.',
    publicApisCategory: 'Social',
    homepageUrl: 'https://hashnode.com/',
    docsUrl: 'https://apidocs.hashnode.com/',
    auth: { mode: 'none', notes: ['Public publication reads require no API key, OAuth, cookies, browser session, or account preparation.'] },
    tags: ['social', 'blogs', 'developer-content', 'graphql'],
    freePlanNotes: ['No public maximum is documented for the publication posts query; CLI caps --first at 20.'],
  },
  operations: [postsOperation],
  endpoints: [
    { id: 'hashnode-graphql', method: 'POST', urlPattern: 'https://gql.hashnode.com', category: 'public-api:social', evidenceStatus: 'confirmed', observedOn: '2026-05-04', sampleSources: ['https://apidocs.hashnode.com/'], consumedBy: ['hashnode.posts'], description: 'Hashnode public GraphQL endpoint for publication posts.', notes: ['No auth required for public publication reads.'] },
  ],
}
