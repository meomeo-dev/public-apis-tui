import {
  HASHNODE_MAX_FIRST,
  HashnodeClient,
  normalizeHashnodePostsInput,
  type HashnodePost,
  type HashnodePostsInput,
} from '../../infrastructure/openApis/hashnodeClient.js'

export type HashnodePostsResult = {
  kind: 'hashnode.posts'
  api: {
    provider: 'hashnode'
    publicApisProject: string
    endpoint: string
    docsUrl: string
    usesBrowserClickstream: false
    authentication: 'none for public publication reads'
    limitPolicy: string
  }
  query: ReturnType<typeof normalizeHashnodePostsInput>
  publication: { id: string; title: string; url?: string | undefined }
  pagination: { returned: number; first: number; maxFirst: number; hasNextPage: boolean; endCursor?: string | undefined }
  posts: HashnodePost[]
}

export async function listHashnodePosts(input: HashnodePostsInput = {}): Promise<HashnodePostsResult> {
  const query = normalizeHashnodePostsInput(input)
  const response = await new HashnodeClient().posts(query)
  return {
    kind: 'hashnode.posts',
    api: {
      provider: 'hashnode',
      publicApisProject: 'https://github.com/public-apis/public-apis',
      endpoint: 'POST https://gql.hashnode.com',
      docsUrl: 'https://apidocs.hashnode.com/',
      usesBrowserClickstream: false,
      authentication: 'none for public publication reads',
      limitPolicy: `No public max documented for this query; CLI caps --first at ${HASHNODE_MAX_FIRST} for readable terminal output.`,
    },
    query,
    publication: response.publication,
    pagination: {
      returned: response.posts.length,
      first: query.first,
      maxFirst: HASHNODE_MAX_FIRST,
      hasNextPage: response.pageInfo.hasNextPage,
      endCursor: response.pageInfo.endCursor,
    },
    posts: response.posts,
  }
}
