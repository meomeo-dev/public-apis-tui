import { withBrowserPage, type BrowserRuntimeOptions } from '../../infrastructure/browser/browserRuntime.js'
import type { EndpointCatalog } from '../../infrastructure/network/endpointCatalog.js'
import {
  startNetworkObservation,
  type NetworkObservation,
  type NetworkObservationSummary,
} from '../../infrastructure/network/networkObserver.js'
import type { SiteAdapter, SiteConfig } from '../../infrastructure/site/siteAdapter.js'

export type InspectNetworkResult = {
  site: SiteConfig
  finalUrl: string
  observations: NetworkObservation[]
  summary: NetworkObservationSummary
}

export async function inspectNetwork(
  adapter: SiteAdapter,
  browserOptions: BrowserRuntimeOptions,
  catalog: EndpointCatalog,
): Promise<InspectNetworkResult> {
  return withBrowserPage(
    {
      ...browserOptions,
      initialUrl: browserOptions.initialUrl ?? adapter.config.baseUrl,
    },
    async lease => {
      const session = startNetworkObservation(lease.page, {
        catalog,
        urlAllowlist: [new URL(adapter.config.baseUrl).origin],
      })
      try {
        await adapter.inspectHome(lease.page, lease.mode)
        return {
          site: adapter.config,
          finalUrl: lease.page.url(),
          observations: [...session.observations],
          summary: session.summary(),
        }
      } finally {
        session.stop()
      }
    },
  )
}
