export const providerConfig = {
  id: 'chroniclingamerica',
  operation: 'chroniclingamerica.search',
  displayName: 'Chronicling America',
  defaultLimit: '5',
  envPrefix: 'CHRONICLINGAMERICA',
  itemArrayPath: 'items',
  cliOptions(env) {
    const options = [
      '--query',
      env.CHRONICLINGAMERICA_QUERY ?? 'news',
      '--count',
      env.CHRONICLINGAMERICA_COUNT ?? this.defaultLimit,
      '--page',
      env.CHRONICLINGAMERICA_PAGE ?? '1',
    ]
    if (env.CHRONICLINGAMERICA_DATES) {
      options.push('--dates', env.CHRONICLINGAMERICA_DATES)
    }
    return options
  },
  query(env) {
    return {
      query: env.CHRONICLINGAMERICA_QUERY ?? 'news',
      count: Number(env.CHRONICLINGAMERICA_COUNT ?? this.defaultLimit),
      page: Number(env.CHRONICLINGAMERICA_PAGE ?? 1),
      dates: env.CHRONICLINGAMERICA_DATES ?? null,
    }
  },
  normalize(result) {
    const items = Array.isArray(result.items) ? result.items : []
    return items.map((item, index) => ({
      id: item.id ?? item.url ?? `${index}`,
      title: item.title,
      source: readFirst(item.partOf) ?? 'Chronicling America',
      publishedAt: item.date,
      updatedAt: undefined,
      url: item.url ?? item.id,
      summary: item.description ?? createArchiveSummary(item),
      authors: [],
      tags: [
        ...readStrings(item.subjects),
        ...readStrings(item.locations),
        ...readStrings(item.onlineFormats),
      ],
      metrics: {
        digitized: item.digitized === true,
        originalFormatCount: readStrings(item.originalFormats).length,
      },
    }))
  },
  pagination(result) {
    return result.pagination ?? {
      returned: Array.isArray(result.items) ? result.items.length : 0,
    }
  },
}

function createArchiveSummary(item) {
  const details = [
    readStrings(item.subjects).slice(0, 3).join(', '),
    readStrings(item.locations).slice(0, 2).join(', '),
  ].filter(Boolean)
  return details.length > 0 ? details.join(' | ') : item.title
}

function readFirst(value) {
  return readStrings(value)[0]
}

function readStrings(value) {
  return Array.isArray(value)
    ? value.filter(item => typeof item === 'string' && item.trim() !== '')
    : []
}
