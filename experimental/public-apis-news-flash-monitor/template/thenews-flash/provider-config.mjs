export const providerConfig = {
  id: 'thenews',
  operation: 'thenews.all',
  displayName: 'TheNewsAPI',
  defaultLimit: '10',
  envPrefix: 'THENEWS',
  itemArrayPath: 'articles',
  cliOptions(env) {
    const options = ['--limit', env.THENEWS_LIMIT ?? this.defaultLimit]
    if (env.THENEWS_SEARCH) options.push('--search', env.THENEWS_SEARCH)
    if (env.THENEWS_LANGUAGE) options.push('--language', env.THENEWS_LANGUAGE)
    if (env.THENEWS_LOCALE) options.push('--locale', env.THENEWS_LOCALE)
    if (env.THENEWS_CATEGORIES) {
      options.push('--categories', env.THENEWS_CATEGORIES)
    }
    if (env.THENEWS_DOMAINS) options.push('--domains', env.THENEWS_DOMAINS)
    if (env.THENEWS_PUBLISHED_AFTER) {
      options.push('--published-after', env.THENEWS_PUBLISHED_AFTER)
    }
    if (env.THENEWS_PUBLISHED_BEFORE) {
      options.push('--published-before', env.THENEWS_PUBLISHED_BEFORE)
    }
    if (env.THENEWS_PUBLISHED_ON) {
      options.push('--published-on', env.THENEWS_PUBLISHED_ON)
    }
    if (env.THENEWS_SORT) options.push('--sort', env.THENEWS_SORT)
    if (env.THENEWS_PAGE) options.push('--page', env.THENEWS_PAGE)
    return options
  },
  query(env) {
    return {
      search: env.THENEWS_SEARCH ?? 'public api',
      language: env.THENEWS_LANGUAGE ?? 'en',
      locale: env.THENEWS_LOCALE ?? null,
      categories: env.THENEWS_CATEGORIES ?? null,
      domains: env.THENEWS_DOMAINS ?? null,
      publishedAfter: env.THENEWS_PUBLISHED_AFTER ?? null,
      publishedBefore: env.THENEWS_PUBLISHED_BEFORE ?? null,
      publishedOn: env.THENEWS_PUBLISHED_ON ?? null,
      sort: env.THENEWS_SORT ?? null,
      limit: Number(env.THENEWS_LIMIT ?? this.defaultLimit),
      page: Number(env.THENEWS_PAGE ?? 1),
    }
  },
  normalize(result) {
    const articles = Array.isArray(result.articles) ? result.articles : []
    return articles.map((article, index) => ({
      id: article.uuid ?? article.url ?? `${index}`,
      title: article.title,
      source: article.source ?? 'TheNewsAPI',
      publishedAt: article.publishedAt ?? article.published_at,
      updatedAt: undefined,
      url: article.url,
      summary: article.description ?? article.snippet ?? article.keywords,
      authors: [],
      tags: [
        ...(Array.isArray(article.categories) ? article.categories : []),
        article.language,
        article.locale,
      ].filter(Boolean),
      metrics: {
        relevanceScore: article.relevanceScore ?? article.relevance_score,
      },
    }))
  },
  pagination(result) {
    return result.pagination ?? {
      ...(result.meta ?? {}),
      returned: result.meta?.returned ??
        (Array.isArray(result.articles) ? result.articles.length : 0),
    }
  },
}
