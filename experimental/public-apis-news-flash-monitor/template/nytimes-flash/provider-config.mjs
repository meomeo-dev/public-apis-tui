export const providerConfig = {
  id: 'nytimes',
  operation: 'nytimes.topStories',
  displayName: 'New York Times',
  defaultLimit: '10',
  envPrefix: 'NYTIMES',
  itemArrayPath: 'articles',
  cliOptions(env) {
    const options = ['--limit', env.NYTIMES_LIMIT ?? this.defaultLimit]
    if (env.NYTIMES_SECTION) options.push('--section', env.NYTIMES_SECTION)
    return options
  },
  query(env) {
    return {
      section: env.NYTIMES_SECTION ?? 'home',
      limit: Number(env.NYTIMES_LIMIT ?? this.defaultLimit),
    }
  },
  normalize(result) {
    const articles = readArticles(result)
    return articles.map((article, index) => ({
      id: article.id ?? article.uri ?? article.url ?? `${index}`,
      title: article.title,
      source: article.source ?? article.section ?? 'New York Times',
      publishedAt: article.publishedAt ?? article.published_date,
      updatedAt: article.updatedAt ?? article.updated_date,
      url: article.url,
      summary: article.abstract ?? article.summary ?? article.description,
      authors: article.byline ? [article.byline] : [],
      tags: [
        article.section,
        article.subsection,
        article.documentType ?? article.item_type,
      ].filter(Boolean),
      metrics: {},
    }))
  },
  pagination(result) {
    const articles = readArticles(result)
    return result.pagination ?? {
      returned: articles.length,
      numResults: result.numResults ?? result.num_results ?? articles.length,
      section: result.section ?? null,
    }
  },
}

function readArticles(result) {
  if (Array.isArray(result.articles)) return result.articles
  if (Array.isArray(result.results)) return result.results
  return []
}
