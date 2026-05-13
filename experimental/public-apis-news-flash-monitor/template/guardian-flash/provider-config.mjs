const defaultShowFields = 'headline,trailText,thumbnail,shortUrl,byline'

export const providerConfig = {
  id: 'guardian',
  operation: 'guardian.search',
  displayName: 'The Guardian',
  defaultLimit: '10',
  envPrefix: 'GUARDIAN',
  itemArrayPath: 'articles',
  cliOptions(env) {
    const options = [
      '--page-size',
      env.GUARDIAN_PAGE_SIZE ?? this.defaultLimit,
    ]
    if (env.GUARDIAN_QUERY) options.push('--query', env.GUARDIAN_QUERY)
    if (env.GUARDIAN_SECTION) options.push('--section', env.GUARDIAN_SECTION)
    if (env.GUARDIAN_TAG) options.push('--tag', env.GUARDIAN_TAG)
    if (env.GUARDIAN_FROM_DATE) {
      options.push('--from-date', env.GUARDIAN_FROM_DATE)
    }
    if (env.GUARDIAN_TO_DATE) options.push('--to-date', env.GUARDIAN_TO_DATE)
    if (env.GUARDIAN_ORDER_BY) {
      options.push('--order-by', env.GUARDIAN_ORDER_BY)
    }
    if (env.GUARDIAN_SHOW_FIELDS) {
      options.push('--show-fields', env.GUARDIAN_SHOW_FIELDS)
    }
    if (env.GUARDIAN_PAGE) options.push('--page', env.GUARDIAN_PAGE)
    return options
  },
  query(env) {
    return {
      query: env.GUARDIAN_QUERY ?? 'public api',
      section: env.GUARDIAN_SECTION ?? null,
      tag: env.GUARDIAN_TAG ?? null,
      fromDate: env.GUARDIAN_FROM_DATE ?? null,
      toDate: env.GUARDIAN_TO_DATE ?? null,
      orderBy: env.GUARDIAN_ORDER_BY ?? null,
      showFields: env.GUARDIAN_SHOW_FIELDS ?? defaultShowFields,
      pageSize: Number(env.GUARDIAN_PAGE_SIZE ?? this.defaultLimit),
      page: Number(env.GUARDIAN_PAGE ?? 1),
    }
  },
  normalize(result) {
    const articles = Array.isArray(result.articles) ? result.articles : []
    return articles.map((article, index) => ({
      id: article.id ?? article.webUrl ?? `${index}`,
      title: article.title,
      source: article.sectionName ?? 'The Guardian',
      publishedAt: article.publishedAt,
      updatedAt: undefined,
      url: article.webUrl,
      summary: stripHtml(article.fields?.trailText) ??
        article.fields?.headline ??
        article.title,
      authors: article.fields?.byline ? [article.fields.byline] : [],
      tags: [
        article.sectionName,
        article.pillarName,
        article.type,
      ].filter(Boolean),
      metrics: {
        hosted: article.isHosted === true,
      },
    }))
  },
  pagination(result) {
    return result.pagination ?? {
      returned: Array.isArray(result.articles) ? result.articles.length : 0,
      total: 0,
    }
  },
}

function stripHtml(value) {
  if (typeof value !== 'string') return undefined
  const stripped = value
    .replace(/<[^>]+>/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
  return stripped === '' ? undefined : stripped
}
