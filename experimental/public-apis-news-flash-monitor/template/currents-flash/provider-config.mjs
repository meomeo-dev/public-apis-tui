export const providerConfig = {
  id: 'currents',
  operation: 'currents.news',
  displayName: 'Currents',
  defaultLimit: '10',
  envPrefix: 'CURRENTS',
  itemArrayPath: 'articles',
  cliOptions(env) {
    const options = ['--page-size', env.CURRENTS_PAGE_SIZE ?? this.defaultLimit]
    if (env.CURRENTS_KEYWORDS) options.push('--keywords', env.CURRENTS_KEYWORDS)
    if (env.CURRENTS_LANGUAGE) options.push('--language', env.CURRENTS_LANGUAGE)
    if (env.CURRENTS_COUNTRY) options.push('--country', env.CURRENTS_COUNTRY)
    if (env.CURRENTS_CATEGORY) options.push('--category', env.CURRENTS_CATEGORY)
    if (env.CURRENTS_PAGE) options.push('--page', env.CURRENTS_PAGE)
    return options
  },
  query(env) {
    return {
      keywords: env.CURRENTS_KEYWORDS ?? null,
      language: env.CURRENTS_LANGUAGE ?? 'en',
      country: env.CURRENTS_COUNTRY ?? null,
      category: env.CURRENTS_CATEGORY ?? null,
      pageSize: Number(env.CURRENTS_PAGE_SIZE ?? this.defaultLimit),
      page: Number(env.CURRENTS_PAGE ?? 1),
    }
  },
  normalize(result) {
    const articles = readArticleArray(result)
    return articles.map((article, index) => ({
      id: article.id ?? article.url ?? `${index}`,
      title: article.title,
      source: readSource(article),
      publishedAt: article.published ?? article.publishedAt,
      updatedAt: undefined,
      url: article.url,
      summary: article.description ?? article.title,
      authors: article.author ? [article.author] : [],
      tags: [
        ...readStrings(article.category),
        article.language,
      ].filter(Boolean),
      metrics: {},
    }))
  },
  pagination(result) {
    return result.pagination ?? {
      page: result.page ?? 1,
      returned: readArticleArray(result).length,
      rateLimitRemaining: result.rateLimit?.remaining,
    }
  },
}

function readArticleArray(result) {
  if (Array.isArray(result.articles)) return result.articles
  if (Array.isArray(result.news)) return result.news
  return []
}

function readSource(article) {
  if (typeof article.source === 'string' && article.source.trim() !== '') {
    return article.source
  }
  if (typeof article.author === 'string' && article.author.trim() !== '') {
    return article.author
  }
  return 'Currents'
}

function readStrings(value) {
  return Array.isArray(value)
    ? value.filter(item => typeof item === 'string' && item.trim() !== '')
    : []
}
