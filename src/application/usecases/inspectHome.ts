import { withBrowserPage, type BrowserRuntimeOptions } from '../../infrastructure/browser/browserRuntime.js'
import type { InspectHomeResult, SiteAdapter } from '../../infrastructure/site/siteAdapter.js'

export async function inspectHome(
  adapter: SiteAdapter,
  browserOptions: BrowserRuntimeOptions,
): Promise<InspectHomeResult> {
  return withBrowserPage(
    {
      ...browserOptions,
      initialUrl: browserOptions.initialUrl ?? adapter.config.baseUrl,
    },
    lease => adapter.inspectHome(lease.page, lease.mode),
  )
}
