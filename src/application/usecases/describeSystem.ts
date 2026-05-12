import type { SiteRegistryConfig } from '../../infrastructure/site/siteAdapter.js'
import { defaultPublicApiRegistry } from '../../providers/providerRegistry.js'
import type { PublicApiProviderManifest } from '../../providers/providerTypes.js'

export type SystemDescription = {
  name: string
  version: string
  registry: SiteRegistryConfig
  site: SiteRegistryConfig['sites'][number]
  commands: string[]
  rpcMethods: string[]
  publicApis: {
    providerCount: number
    operationCount: number
    providers: PublicApiProviderManifest[]
    operations: Array<{
      id: string
      providerId: string
      command: string
      rpcMethod: string
      description: string
      category: string
    }>
  }
  browser: {
    acceptsCdpUrl: boolean
    acceptsManagedSession: boolean
    acceptsChromePath: boolean
    acceptsUserDataDir: boolean
    acceptsChromeProfileDirectory: boolean
    acceptsAuthProfileSelection: boolean
    supportsSharedUserDataDir: boolean
    supportsProfileConsistency: boolean
    supportsInteractionPacing: boolean
    supportsSessionImportExport: boolean
    supportsDedicatedManagedAuthProfiles: boolean
    supportsProfileClone: boolean
    supportsManagedSessionList: boolean
    supportsManagedSessionStop: boolean
    defaultsCommandRunsHeadless: boolean
    checksRequiredAuthProfileReadiness: boolean
    usesUnifiedProfileRoot: boolean
    hardensManagedProfileDirectories: boolean
  }
}

export function describeSystem(
  name: string,
  version: string,
  registry: SiteRegistryConfig,
): SystemDescription {
  return {
    name,
    version,
    registry,
    site: resolveDefaultSite(registry),
    commands: [
      'describe',
      'sites',
      'workflows',
      'apis list',
      'apis info',
      'apis config',
      'apis run',
      'apis cache list',
      'apis cache clear',
      ...defaultPublicApiRegistry.operations.map(operation => operation.commandPath.join(' ')),
      'auth login',
      'auth logout',
      'browser list',
      'browser stop',
      'profile show',
      'profile clone',
      'endpoints',
      'inspect-home',
      'inspect-network',
      'search',
      'session-export',
      'session-import',
      'rpc',
    ],
    rpcMethods: [
      'system.describe',
      'site.list',
      'workflow.list',
      'publicApis.list',
      'publicApis.info',
      'publicApis.config',
      'publicApis.cacheList',
      'publicApis.cacheClear',
      ...defaultPublicApiRegistry.operations.map(operation => operation.rpcMethod),
      'browser.authProfileShow',
      'browser.authLogin',
      'browser.authLogout',
      'browser.sessionList',
      'browser.sessionStop',
      'browser.profileClone',
      'endpoint.list',
      'site.inspectHome',
      'site.inspectNetwork',
      'site.search',
      'browser.sessionExport',
      'browser.sessionImport',
    ],
    publicApis: {
      providerCount: defaultPublicApiRegistry.providers.length,
      operationCount: defaultPublicApiRegistry.operations.length,
      providers: defaultPublicApiRegistry.manifests,
      operations: defaultPublicApiRegistry.operations.map(operation => ({
        id: operation.id,
        providerId: operation.providerId,
        command: operation.commandPath.join(' '),
        rpcMethod: operation.rpcMethod,
        description: operation.description,
        category: operation.category,
      })),
    },
    browser: {
      acceptsCdpUrl: true,
      acceptsManagedSession: true,
      acceptsChromePath: true,
      acceptsUserDataDir: true,
      acceptsChromeProfileDirectory: true,
      acceptsAuthProfileSelection: true,
      supportsSharedUserDataDir: true,
      supportsProfileConsistency: true,
      supportsInteractionPacing: true,
      supportsSessionImportExport: true,
      supportsDedicatedManagedAuthProfiles: true,
      supportsProfileClone: true,
      supportsManagedSessionList: true,
      supportsManagedSessionStop: true,
      defaultsCommandRunsHeadless: true,
      checksRequiredAuthProfileReadiness: true,
      usesUnifiedProfileRoot: true,
      hardensManagedProfileDirectories: true,
    },
  }
}

function resolveDefaultSite(registry: SiteRegistryConfig): SiteRegistryConfig['sites'][number] {
  const site = registry.sites.find(entry => entry.id === registry.defaultSiteId) ?? registry.sites[0]
  if (site === undefined) {
    throw new Error('Site registry must contain at least one site.')
  }
  return site
}
