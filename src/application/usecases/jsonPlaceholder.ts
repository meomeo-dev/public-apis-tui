import {
  JsonPlaceholderClient,
  normalizeJsonPlaceholderPostInput,
  normalizeJsonPlaceholderPostsInput,
  type JsonPlaceholderPostInput,
  type JsonPlaceholderPostsInput,
  type JsonPlaceholderRateLimit,
} from '../../infrastructure/openApis/jsonPlaceholderClient.js'

const docsUrl = 'https://jsonplaceholder.typicode.com/'

export type JsonPlaceholderPostsResult = {
  kind: 'jsonplaceholder.posts'
  api: {
    provider: 'jsonplaceholder'
    endpoint: 'GET /posts'
    authentication: 'none'
    usesBrowserClickstream: false
    docsUrl: string
    defaultLimit: number
  }
  query: {
    limit: number
    userId?: number | undefined
  }
  posts: Array<Record<string, unknown>>
  pagination: {
    returned: number
    total?: string | undefined
    limit: number
  }
  rateLimit: JsonPlaceholderRateLimit
}

export type JsonPlaceholderPostResult = {
  kind: 'jsonplaceholder.post'
  api: {
    provider: 'jsonplaceholder'
    endpoint: 'GET /posts/{id}'
    authentication: 'none'
    usesBrowserClickstream: false
    docsUrl: string
  }
  query: {
    id: number
  }
  post: Record<string, unknown>
  pagination: {
    returned: number
  }
  rateLimit: JsonPlaceholderRateLimit
}

export async function listJsonPlaceholderPosts(input: JsonPlaceholderPostsInput = {}): Promise<JsonPlaceholderPostsResult> {
  const query = normalizeJsonPlaceholderPostsInput(input)
  const client = new JsonPlaceholderClient()
  const { posts, rateLimit } = await client.listPosts(query)
  return {
    kind: 'jsonplaceholder.posts',
    api: {
      provider: 'jsonplaceholder',
      endpoint: 'GET /posts',
      authentication: 'none',
      usesBrowserClickstream: false,
      docsUrl,
      defaultLimit: 100,
    },
    query,
    posts,
    pagination: {
      returned: posts.length,
      total: rateLimit.totalCount,
      limit: query.limit,
    },
    rateLimit,
  }
}

export async function getJsonPlaceholderPost(input: JsonPlaceholderPostInput = {}): Promise<JsonPlaceholderPostResult> {
  const query = normalizeJsonPlaceholderPostInput(input)
  const client = new JsonPlaceholderClient()
  const { post, rateLimit } = await client.getPost(query)
  return {
    kind: 'jsonplaceholder.post',
    api: {
      provider: 'jsonplaceholder',
      endpoint: 'GET /posts/{id}',
      authentication: 'none',
      usesBrowserClickstream: false,
      docsUrl,
    },
    query,
    post: post ?? {},
    pagination: { returned: post === undefined ? 0 : 1 },
    rateLimit,
  }
}
