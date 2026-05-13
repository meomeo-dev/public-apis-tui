export const providerConfig = {
  id: 'marketaux',
  operation: 'marketaux.news',
  displayName: 'MarketAux',
  defaultLimit: '10',
  envPrefix: 'MARKETAUX',
  itemArrayPath: 'articles',
  cliOptions(env) {
    const options = ['--limit', env.MARKETAUX_LIMIT ?? this.defaultLimit]
    if (env.MARKETAUX_SEARCH) options.push('--search', env.MARKETAUX_SEARCH)
    if (env.MARKETAUX_SYMBOLS) {
      options.push('--symbols', env.MARKETAUX_SYMBOLS)
    }
    if (env.MARKETAUX_COUNTRIES) {
      options.push('--countries', env.MARKETAUX_COUNTRIES)
    }
    if (env.MARKETAUX_INDUSTRIES) {
      options.push('--industries', env.MARKETAUX_INDUSTRIES)
    }
    if (env.MARKETAUX_LANGUAGE) {
      options.push('--language', env.MARKETAUX_LANGUAGE)
    }
    if (env.MARKETAUX_SENTIMENT_MIN) {
      options.push('--sentiment-min', env.MARKETAUX_SENTIMENT_MIN)
    }
    if (env.MARKETAUX_SENTIMENT_MAX) {
      options.push('--sentiment-max', env.MARKETAUX_SENTIMENT_MAX)
    }
    if (env.MARKETAUX_PUBLISHED_AFTER) {
      options.push('--published-after', env.MARKETAUX_PUBLISHED_AFTER)
    }
    if (env.MARKETAUX_PUBLISHED_BEFORE) {
      options.push('--published-before', env.MARKETAUX_PUBLISHED_BEFORE)
    }
    if (env.MARKETAUX_PAGE) options.push('--page', env.MARKETAUX_PAGE)
    return options
  },
  query(env) {
    return {
      search: env.MARKETAUX_SEARCH ?? null,
      symbols: env.MARKETAUX_SYMBOLS ?? null,
      countries: env.MARKETAUX_COUNTRIES ?? null,
      industries: env.MARKETAUX_INDUSTRIES ?? null,
      language: env.MARKETAUX_LANGUAGE ?? null,
      sentimentMin: optionalNumber(env.MARKETAUX_SENTIMENT_MIN),
      sentimentMax: optionalNumber(env.MARKETAUX_SENTIMENT_MAX),
      publishedAfter: env.MARKETAUX_PUBLISHED_AFTER ?? null,
      publishedBefore: env.MARKETAUX_PUBLISHED_BEFORE ?? null,
      limit: Number(env.MARKETAUX_LIMIT ?? this.defaultLimit),
      page: Number(env.MARKETAUX_PAGE ?? 1),
    }
  },
  normalize(result) {
    const articles = Array.isArray(result.articles) ? result.articles : []
    return articles.map((article, index) => ({
      id: article.uuid ?? article.url ?? `${index}`,
      title: article.title,
      source: article.source ?? 'MarketAux',
      publishedAt: article.publishedAt,
      updatedAt: undefined,
      url: article.url,
      summary: article.description ?? article.snippet,
      authors: [],
      tags: [
        article.language,
        ...readKeywords(article.keywords),
        ...readEntitySymbols(article.entities),
      ].filter(Boolean),
      metrics: {
        relevanceScore: article.relevanceScore,
        entityCount: Array.isArray(article.entities)
          ? article.entities.length
          : 0,
      },
    }))
  },
  pagination(result) {
    return result.pagination ?? {
      returned: Array.isArray(result.articles) ? result.articles.length : 0,
      found: 0,
    }
  },
}

function optionalNumber(value) {
  return value === undefined ? null : Number(value)
}

function readKeywords(value) {
  if (typeof value !== 'string') return []
  return value
    .split(',')
    .map(keyword => keyword.trim())
    .filter(Boolean)
}

function readEntitySymbols(value) {
  if (!Array.isArray(value)) return []
  return value
    .map(entity => entity?.symbol)
    .filter(symbol => typeof symbol === 'string' && symbol.trim() !== '')
}
