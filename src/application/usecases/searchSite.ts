import { withBrowserPage, type BrowserRuntimeOptions } from '../../infrastructure/browser/browserRuntime.js'
import type { SearchResult, SiteAdapter } from '../../infrastructure/site/siteAdapter.js'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export async function searchSite(
  adapter: SiteAdapter,
  browserOptions: BrowserRuntimeOptions,
  query: string,
): Promise<SearchResult> {
  const trimmedQuery = query.trim()
  if (trimmedQuery.length === 0) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Search query must not be empty.')
  }

  return withBrowserPage(
    {
      ...browserOptions,
      initialUrl: browserOptions.initialUrl ?? adapter.config.baseUrl,
    },
    lease => adapter.search(lease.page, trimmedQuery),
  )
}
