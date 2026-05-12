export const providerConfig = {
  id: 'spaceflightnews',
  operation: 'spaceflightnews.articles',
  displayName: 'Spaceflight News',
  defaultLimit: '10',
  envPrefix: 'SPACEFLIGHTNEWS',
  itemArrayPath: 'articles',
  cliOptions(env) {
    const options = ['--limit', env.SPACEFLIGHTNEWS_LIMIT ?? this.defaultLimit]
    if (env.SPACEFLIGHTNEWS_SEARCH) options.push('--search', env.SPACEFLIGHTNEWS_SEARCH)
    if (env.SPACEFLIGHTNEWS_SITE) options.push('--news-site', env.SPACEFLIGHTNEWS_SITE)
    return options
  },
  query(env) {
    return {
      limit: Number(env.SPACEFLIGHTNEWS_LIMIT ?? this.defaultLimit),
      search: env.SPACEFLIGHTNEWS_SEARCH ?? null,
      newsSite: env.SPACEFLIGHTNEWS_SITE ?? null,
    }
  },
  normalize(result) {
    const articles = Array.isArray(result.articles) ? result.articles : []
    return articles.map(article => ({
      id: article.id,
      title: article.title,
      source: article.newsSite ?? 'Spaceflight News',
      publishedAt: article.publishedAt,
      updatedAt: article.updatedAt,
      url: article.url,
      summary: article.summary,
      authors: Array.isArray(article.authors) ? article.authors.map(author => author.name).filter(Boolean) : [],
      tags: [],
      metrics: {
        launchCount: Array.isArray(article.launches) ? article.launches.length : article.launchCount ?? 0,
        eventCount: Array.isArray(article.events) ? article.events.length : article.eventCount ?? 0,
      },
    }))
  },
  pagination(result) {
    return result.pagination ?? null
  },
}
