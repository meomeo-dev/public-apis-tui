export const providerConfig = {
  id: 'hackernews',
  operation: 'hackernews.stories',
  displayName: 'Hacker News',
  defaultLimit: '10',
  envPrefix: 'HACKERNEWS',
  itemArrayPath: 'stories',
  cliOptions(env) {
    return [
      '--list', env.HACKERNEWS_LIST ?? 'top',
      '--limit', env.HACKERNEWS_LIMIT ?? this.defaultLimit,
    ]
  },
  query(env) {
    return {
      list: env.HACKERNEWS_LIST ?? 'top',
      limit: Number(env.HACKERNEWS_LIMIT ?? this.defaultLimit),
    }
  },
  normalize(result) {
    const stories = Array.isArray(result.stories) ? result.stories : []
    return stories.map(story => ({
      id: story.id,
      title: story.title,
      source: 'Hacker News',
      publishedAt: typeof story.time === 'number' ? new Date(story.time * 1000).toISOString() : undefined,
      updatedAt: undefined,
      url: story.url ?? `https://news.ycombinator.com/item?id=${story.id}`,
      discussionUrl: `https://news.ycombinator.com/item?id=${story.id}`,
      summary: story.text,
      authors: story.by ? [story.by] : [],
      tags: [story.type].filter(Boolean),
      metrics: {
        score: story.score ?? 0,
        comments: story.descendants ?? 0,
      },
    }))
  },
  pagination(result) {
    return {
      returned: Array.isArray(result.stories) ? result.stories.length : 0,
      upstreamListSize: result.api?.upstreamListSize,
      fanoutLimit: result.api?.fanoutLimit,
    }
  },
}
