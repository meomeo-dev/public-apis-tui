export const providerConfig = {
  id: 'mediastack',
  operation: 'mediastack.news',
  displayName: 'Mediastack',
  defaultLimit: '10',
  envPrefix: 'MEDIASTACK',
  itemArrayPath: 'articles',
  cliOptions(env) {
    const options = ['--limit', env.MEDIASTACK_LIMIT ?? this.defaultLimit]
    if (env.MEDIASTACK_KEYWORDS) {
      options.push('--keywords', env.MEDIASTACK_KEYWORDS)
    }
    if (env.MEDIASTACK_SOURCES) {
      options.push('--sources', env.MEDIASTACK_SOURCES)
    }
    if (env.MEDIASTACK_CATEGORIES) {
      options.push('--categories', env.MEDIASTACK_CATEGORIES)
    }
    if (env.MEDIASTACK_COUNTRIES) {
      options.push('--countries', env.MEDIASTACK_COUNTRIES)
    }
    if (env.MEDIASTACK_LANGUAGES) {
      options.push('--languages', env.MEDIASTACK_LANGUAGES)
    }
    if (env.MEDIASTACK_DATE) options.push('--date', env.MEDIASTACK_DATE)
    if (env.MEDIASTACK_SORT) options.push('--sort', env.MEDIASTACK_SORT)
    if (env.MEDIASTACK_OFFSET) options.push('--offset', env.MEDIASTACK_OFFSET)
    return options
  },
  query(env) {
    return {
      keywords: env.MEDIASTACK_KEYWORDS ?? null,
      sources: env.MEDIASTACK_SOURCES ?? null,
      categories: env.MEDIASTACK_CATEGORIES ?? null,
      countries: env.MEDIASTACK_COUNTRIES ?? null,
      languages: env.MEDIASTACK_LANGUAGES ?? null,
      date: env.MEDIASTACK_DATE ?? null,
      sort: env.MEDIASTACK_SORT ?? 'published_desc',
      limit: Number(env.MEDIASTACK_LIMIT ?? this.defaultLimit),
      offset: env.MEDIASTACK_OFFSET ? Number(env.MEDIASTACK_OFFSET) : null,
    }
  },
  normalize(result) {
    const articles = Array.isArray(result.articles) ? result.articles : []
    return articles.map((article, index) => ({
      id: article.url ?? `${index}`,
      title: article.title,
      source: article.source ?? 'Mediastack',
      publishedAt: article.publishedAt,
      updatedAt: undefined,
      url: article.url,
      summary: article.description ?? article.title,
      authors: article.author ? [article.author] : [],
      tags: [
        article.category,
        article.country,
        article.language,
      ].filter(Boolean),
      metrics: {},
    }))
  },
  pagination(result) {
    return result.pagination ?? {
      returned: Array.isArray(result.articles) ? result.articles.length : 0,
    }
  },
}
