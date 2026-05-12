export const providerConfig = {
  id: 'newsapi',
  operation: 'newsapi.headlines',
  displayName: 'NewsAPI',
  defaultLimit: '10',
  envPrefix: 'NEWSAPI',
  itemArrayPath: 'articles',
  cliOptions(env) {
    const options = ['--page-size', env.NEWSAPI_PAGE_SIZE ?? this.defaultLimit]
    if (env.NEWSAPI_COUNTRY) options.push('--country', env.NEWSAPI_COUNTRY)
    if (env.NEWSAPI_CATEGORY) options.push('--category', env.NEWSAPI_CATEGORY)
    if (env.NEWSAPI_QUERY) options.push('--query', env.NEWSAPI_QUERY)
    if (env.NEWSAPI_SOURCES) options.push('--sources', env.NEWSAPI_SOURCES)
    if (env.NEWSAPI_PAGE) options.push('--page', env.NEWSAPI_PAGE)
    return options
  },
  query(env) {
    return {
      country: env.NEWSAPI_COUNTRY ?? 'us',
      category: env.NEWSAPI_CATEGORY ?? null,
      query: env.NEWSAPI_QUERY ?? null,
      sources: env.NEWSAPI_SOURCES ?? null,
      pageSize: Number(env.NEWSAPI_PAGE_SIZE ?? this.defaultLimit),
      page: Number(env.NEWSAPI_PAGE ?? 1),
    }
  },
  normalize(result) {
    const articles = Array.isArray(result.articles) ? result.articles : []
    return articles.map((article, index) => ({
      id: article.url ?? `${index}`,
      title: article.title,
      source: article.source?.name ?? 'NewsAPI',
      publishedAt: article.publishedAt,
      updatedAt: undefined,
      url: article.url,
      summary: article.description ?? article.content,
      authors: article.author ? [article.author] : [],
      tags: [],
      metrics: {},
    }))
  },
  pagination(result) {
    return result.pagination ?? {
      returned: Array.isArray(result.articles) ? result.articles.length : 0,
      totalResults: result.totalResults ?? 0,
    }
  },
}
