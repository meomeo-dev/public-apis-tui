export const providerConfig = {
  id: 'hashnode',
  operation: 'hashnode.posts',
  displayName: 'Hashnode',
  defaultLimit: '10',
  envPrefix: 'HASHNODE',
  itemArrayPath: 'posts',
  cliOptions(env) {
    const options = ['--first', env.HASHNODE_FIRST ?? this.defaultLimit]
    if (env.HASHNODE_HOST) options.push('--host', env.HASHNODE_HOST)
    if (env.HASHNODE_AFTER) options.push('--after', env.HASHNODE_AFTER)
    return options
  },
  query(env) {
    return {
      host: env.HASHNODE_HOST ?? 'blog.developerdao.com',
      first: Number(env.HASHNODE_FIRST ?? this.defaultLimit),
      after: env.HASHNODE_AFTER ?? null,
    }
  },
  normalize(result) {
    const posts = Array.isArray(result.posts) ? result.posts : []
    return posts.map(post => ({
      id: post.id,
      title: post.title,
      source: result.publication?.title ?? 'Hashnode',
      publishedAt: post.publishedAt,
      updatedAt: undefined,
      url: post.url,
      summary: post.brief,
      authors: post.author?.name ? [post.author.name] : [],
      tags: Array.isArray(post.tags) ? post.tags.map(tag => tag.name).filter(Boolean) : [],
      metrics: {
        readTimeInMinutes: post.readTimeInMinutes ?? 0,
      },
    }))
  },
  pagination(result) {
    return result.pagination ?? null
  },
}
