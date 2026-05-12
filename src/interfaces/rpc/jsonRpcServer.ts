import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import { z } from 'zod'
import { showManagedProfile } from '../../application/usecases/profileManagement.js'
import { resolveBrowserOptionsForSite } from '../../application/usecases/browserOptions.js'
import { cloneAuthProfile, loginAuthProfile, logoutAuthProfile } from '../../application/usecases/authProfiles.js'
import { listBrowserSessions, stopBrowserSession } from '../../application/usecases/browserSessions.js'
import { describeSystem } from '../../application/usecases/describeSystem.js'
import { executePublicApiOperation } from '../../application/usecases/executePublicApiOperation.js'
import { clearPublicApiCache, listPublicApiCache, resolveCacheTarget } from '../../application/usecases/publicApiCache.js'
import { inspectNetwork } from '../../application/usecases/inspectNetwork.js'
import { listEndpoints } from '../../application/usecases/listEndpoints.js'
import { describePublicApiProvider, listPublicApis } from '../../application/usecases/publicApis.js'
import { showPublicApiProviderConfig, writePublicApiProviderConfig } from '../../infrastructure/persistence/publicApiConfig.js'
import { exportSessionState, importSessionState } from '../../application/usecases/sessionState.js'
import type { EndpointCatalog } from '../../infrastructure/network/endpointCatalog.js'
import { inspectHome } from '../../application/usecases/inspectHome.js'
import { searchSite } from '../../application/usecases/searchSite.js'
import { defaultPublicApiRegistry, type PublicApiRegistry } from '../../providers/providerRegistry.js'
import type { BrowserRuntimeOptions } from '../../infrastructure/browser/browserRuntime.js'
import type { SiteRegistry } from '../../infrastructure/site/siteRegistry.js'
import { RuntimeFailure, serializeError } from '../../shared/errors/runtimeFailure.js'

const requestSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number(), z.null()]).optional(),
  method: z.string(),
  params: z.unknown().optional(),
})

const inspectParamsSchema = z.object({
  siteId: z.string().min(1).optional(),
})

const searchParamsSchema = z.object({
  query: z.string().min(1),
  siteId: z.string().min(1).optional(),
})

const sessionStateParamsSchema = z.object({
  path: z.string().min(1),
})

const sessionStopParamsSchema = z.object({
  sessionId: z.string().min(1),
  force: z.boolean().optional(),
})

const authProfileParamsSchema = z.object({
  siteId: z.string().min(1).optional(),
  authProfileId: z.string().min(1).optional(),
})

const authLoginParamsSchema = authProfileParamsSchema.extend({
  url: z.string().min(1).optional(),
  force: z.boolean().optional(),
})

const profileCloneParamsSchema = authProfileParamsSchema.extend({
  sourceUserDataDir: z.string().min(1),
  sourceProfileDirectory: z.string().min(1).optional(),
  force: z.boolean().optional(),
})

const publicApiInfoParamsSchema = z.object({
  id: z.string().min(1),
})

const publicApiConfigParamsSchema = z.object({
  providerId: z.string().min(1),
  persist: z.boolean().optional(),
  defaultMode: z.enum(['online', 'offline']).optional(),
  secrets: z.record(z.string(), z.string().optional()).optional(),
})

const publicApiExecutionParamsSchema = z.object({
  mode: z.enum(['online', 'offline']).optional(),
  persist: z.boolean().optional(),
}).passthrough()

const publicApiCacheParamsSchema = z.object({
  providerOrOperation: z.string().min(1),
  limit: z.number().int().min(1).max(500).optional(),
})

type RequestId = string | number | null

export type JsonRpcServerOptions = {
  packageName: string
  packageVersion: string
  registry: SiteRegistry
  endpointCatalog: EndpointCatalog
  browserOptions: BrowserRuntimeOptions
  publicApiRegistry?: PublicApiRegistry | undefined
}

export async function runJsonRpcServer(options: JsonRpcServerOptions): Promise<void> {
  const input = createInterface({ input: stdin })

  for await (const line of input) {
    if (line.trim() === '') {
      continue
    }

    const response = await handleJsonRpcLine(options, line)
    stdout.write(`${JSON.stringify(response)}\n`)
  }
}

export async function handleJsonRpcLine(options: JsonRpcServerOptions, line: string): Promise<unknown> {
  const requestId = readRequestId(line)
  try {
    const parsed = requestSchema.parse(JSON.parse(line))
    const result = await dispatch(options, parsed.method, parsed.params)
    return {
      jsonrpc: '2.0',
      id: parsed.id ?? null,
      result,
    }
  } catch (error) {
    return {
      jsonrpc: '2.0',
      id: requestId,
      error: serializeRpcError(error),
    }
  }
}

async function dispatch(
  options: JsonRpcServerOptions,
  method: string,
  params: unknown,
): Promise<unknown> {
  const publicApiRegistry = options.publicApiRegistry ?? defaultPublicApiRegistry
  const publicApiOperation = publicApiRegistry.operations.find(operation => operation.rpcMethod === method)
  if (publicApiOperation !== undefined) {
    const parsedParams = publicApiExecutionParamsSchema.parse(params ?? {})
    const { mode, persist, ...operationParams } = parsedParams
    return executePublicApiOperation({
      operation: publicApiOperation,
      params: operationParams,
      mode,
      persist,
    })
  }

  switch (method) {
    case 'system.describe':
      return describeSystem(options.packageName, options.packageVersion, options.registry.config)
    case 'site.list':
      return {
        defaultSiteId: options.registry.config.defaultSiteId,
        sites: options.registry.config.sites,
        authProfiles: options.registry.config.authProfiles,
      }
    case 'workflow.list':
      return { workflows: options.registry.config.workflows }
    case 'publicApis.list':
      return listPublicApis(publicApiRegistry)
    case 'publicApis.info': {
      const parsedParams = publicApiInfoParamsSchema.parse(params)
      return describePublicApiProvider(parsedParams.id, publicApiRegistry)
    }
    case 'publicApis.config': {
      const parsedParams = publicApiConfigParamsSchema.parse(params)
      if (parsedParams.persist !== undefined || parsedParams.defaultMode !== undefined || parsedParams.secrets !== undefined) {
        return writePublicApiProviderConfig(parsedParams)
      }
      return showPublicApiProviderConfig(parsedParams.providerId)
    }
    case 'publicApis.cacheList': {
      const parsedParams = publicApiCacheParamsSchema.parse(params)
      const target = resolveCacheTarget(parsedParams.providerOrOperation, publicApiRegistry)
      return listPublicApiCache({
        ...target,
        limit: parsedParams.limit,
      })
    }
    case 'publicApis.cacheClear': {
      const parsedParams = publicApiCacheParamsSchema.omit({ limit: true }).parse(params)
      const target = resolveCacheTarget(parsedParams.providerOrOperation, publicApiRegistry)
      return clearPublicApiCache(target)
    }
    case 'browser.authProfileShow': {
      const parsedParams = authProfileParamsSchema.parse(params ?? {})
      return showManagedProfile(options.registry, parsedParams)
    }
    case 'browser.authLogin': {
      const parsedParams = authLoginParamsSchema.parse(params ?? {})
      return loginAuthProfile(options.registry, {
        siteId: parsedParams.siteId,
        authProfileId: parsedParams.authProfileId,
        browserOptions: options.browserOptions,
        url: parsedParams.url,
        force: parsedParams.force,
      })
    }
    case 'browser.authLogout': {
      const parsedParams = authProfileParamsSchema.parse(params ?? {})
      return logoutAuthProfile(options.registry, parsedParams)
    }
    case 'browser.sessionList':
      return listBrowserSessions()
    case 'browser.sessionStop': {
      const parsedParams = sessionStopParamsSchema.parse(params)
      return stopBrowserSession(parsedParams.sessionId, {
        force: parsedParams.force,
        timeoutMs: options.browserOptions.timeoutMs,
      })
    }
    case 'browser.profileClone': {
      const parsedParams = profileCloneParamsSchema.parse(params)
      return cloneAuthProfile(options.registry, parsedParams)
    }
    case 'endpoint.list':
      return listEndpoints(options.endpointCatalog)
    case 'site.inspectHome': {
      const parsedParams = inspectParamsSchema.parse(params ?? {})
      return inspectHome(
        options.registry.createAdapter(parsedParams.siteId),
        resolveBrowserOptionsForSite(options.registry, options.browserOptions, parsedParams.siteId, {
          required: true,
        }),
      )
    }
    case 'site.inspectNetwork': {
      const parsedParams = inspectParamsSchema.parse(params ?? {})
      return inspectNetwork(
        options.registry.createAdapter(parsedParams.siteId),
        resolveBrowserOptionsForSite(options.registry, options.browserOptions, parsedParams.siteId, {
          required: true,
        }),
        options.endpointCatalog,
      )
    }
    case 'site.search': {
      const parsedParams = searchParamsSchema.parse(params)
      return searchSite(
        options.registry.createAdapter(parsedParams.siteId),
        resolveBrowserOptionsForSite(options.registry, options.browserOptions, parsedParams.siteId, {
          required: true,
        }),
        parsedParams.query,
      )
    }
    case 'browser.sessionExport': {
      const parsedParams = sessionStateParamsSchema.parse(params)
      return exportSessionState(options.browserOptions, parsedParams.path)
    }
    case 'browser.sessionImport': {
      const parsedParams = sessionStateParamsSchema.parse(params)
      return importSessionState(options.browserOptions, parsedParams.path)
    }
    default:
      throw new RuntimeFailure('RPC_METHOD_NOT_FOUND', `Unknown RPC method: ${method}`, { method })
  }
}

function readRequestId(line: string): RequestId {
  try {
    const parsed = JSON.parse(line) as Record<string, unknown>
    if (typeof parsed.id === 'string' || typeof parsed.id === 'number' || parsed.id === null) {
      return parsed.id
    }
  } catch {
    return null
  }

  return null
}

function serializeRpcError(error: unknown): { code: number; message: string; data: Record<string, unknown> } {
  const data = serializeError(error)
  const runtimeCode = typeof data.code === 'string' ? data.code : undefined
  const code = runtimeCode === 'RPC_METHOD_NOT_FOUND' ? -32601 : -32000
  return {
    code,
    message: String(data.message ?? 'RPC error'),
    data,
  }
}
