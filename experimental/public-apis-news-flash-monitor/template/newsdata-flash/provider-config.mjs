export const providerConfig = {
  id: 'newsdata',
  operation: 'newsdata.latest',
  displayName: 'NewsData.io',
  defaultLimit: '10',
  envPrefix: 'NEWSDATA',
  itemArrayPath: 'articles',
  cliOptions(env) {
    const options = ['--size', env.NEWSDATA_SIZE ?? this.defaultLimit]
    if (env.NEWSDATA_QUERY) options.push('--query', env.NEWSDATA_QUERY)
    if (env.NEWSDATA_SEARCH_IN) {
      options.push('--search-in', env.NEWSDATA_SEARCH_IN)
    }
    if (env.NEWSDATA_LANGUAGE) {
      options.push('--language', env.NEWSDATA_LANGUAGE)
    }
    if (env.NEWSDATA_COUNTRY) options.push('--country', env.NEWSDATA_COUNTRY)
    if (env.NEWSDATA_CATEGORY) {
      options.push('--category', env.NEWSDATA_CATEGORY)
    }
    if (env.NEWSDATA_DOMAIN) options.push('--domain', env.NEWSDATA_DOMAIN)
    if (env.NEWSDATA_SORT) options.push('--sort', env.NEWSDATA_SORT)
    if (env.NEWSDATA_DEDUPE) options.push('--dedupe')
    if (env.NEWSDATA_PAGE) options.push('--page', env.NEWSDATA_PAGE)
    return options
  },
  query(env) {
    return {
      query: env.NEWSDATA_QUERY ?? null,
      searchIn: env.NEWSDATA_SEARCH_IN ?? 'all',
      language: env.NEWSDATA_LANGUAGE ?? 'en',
      country: env.NEWSDATA_COUNTRY ?? null,
      category: env.NEWSDATA_CATEGORY ?? null,
      domain: env.NEWSDATA_DOMAIN ?? null,
      sort: env.NEWSDATA_SORT ?? null,
      dedupe: parseBooleanEnv(env.NEWSDATA_DEDUPE),
      size: Number(env.NEWSDATA_SIZE ?? this.defaultLimit),
      page: env.NEWSDATA_PAGE ?? null,
    }
  },
  normalize(result) {
    const articles = Array.isArray(result.articles) ? result.articles : []
    return articles.map(article => ({
      id: article.id,
      title: article.title,
      source: article.source?.name ?? article.source?.id ?? 'NewsData.io',
      publishedAt: article.publishedAt,
      updatedAt: article.fetchedAt,
      url: article.url,
      summary: article.description ?? article.content ?? article.title,
      authors: Array.isArray(article.creator) ? article.creator : [],
      tags: [
        ...(Array.isArray(article.keywords) ? article.keywords : []),
        ...(Array.isArray(article.categories) ? article.categories : []),
        ...(Array.isArray(article.countries) ? article.countries : []),
        article.language,
      ].filter(Boolean),
      metrics: {
        duplicate: article.duplicate ?? false,
      },
    }))
  },
  pagination(result) {
    return result.pagination ?? {
      returned: Array.isArray(result.articles) ? result.articles.length : 0,
      totalResults: result.totalResults ?? 0,
      nextPage: result.nextPage ?? null,
    }
  },
}

function parseBooleanEnv(value) {
  if (value === undefined || value === '') return null
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase())
}
