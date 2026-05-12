export const providerConfig = {
  id: 'gnews',
  operation: 'gnews.headlines',
  displayName: 'GNews',
  defaultLimit: '10',
  envPrefix: 'GNEWS',
  itemArrayPath: 'articles',
  cliOptions(env) {
    const options = ['--max', env.GNEWS_MAX ?? this.defaultLimit]
    if (env.GNEWS_CATEGORY) options.push('--category', env.GNEWS_CATEGORY)
    if (env.GNEWS_QUERY) options.push('--query', env.GNEWS_QUERY)
    if (env.GNEWS_LANGUAGE) options.push('--language', env.GNEWS_LANGUAGE)
    if (env.GNEWS_COUNTRY) options.push('--country', env.GNEWS_COUNTRY)
    if (env.GNEWS_FROM) options.push('--from', env.GNEWS_FROM)
    if (env.GNEWS_TO) options.push('--to', env.GNEWS_TO)
    if (env.GNEWS_PAGE) options.push('--page', env.GNEWS_PAGE)
    return options
  },
  query(env) {
    return {
      category: env.GNEWS_CATEGORY ?? 'general',
      query: env.GNEWS_QUERY ?? null,
      language: env.GNEWS_LANGUAGE ?? null,
      country: env.GNEWS_COUNTRY ?? null,
      max: Number(env.GNEWS_MAX ?? this.defaultLimit),
      page: Number(env.GNEWS_PAGE ?? 1),
    }
  },
  normalize(result) {
    const articles = Array.isArray(result.articles) ? result.articles : []
    return articles.map((article, index) => ({
      id: article.id ?? article.url ?? `${index}`,
      title: article.title,
      source: article.source?.name ?? 'GNews',
      publishedAt: article.publishedAt,
      updatedAt: undefined,
      url: article.url,
      summary: article.description ?? article.content,
      authors: [],
      tags: [article.language].filter(Boolean),
      metrics: {},
    }))
  },
  pagination(result) {
    return result.pagination ?? {
      returned: Array.isArray(result.articles) ? result.articles.length : 0,
      totalArticles: result.totalArticles ?? 0,
    }
  },
}
