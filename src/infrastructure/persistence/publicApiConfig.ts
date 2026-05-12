import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import {
  resolvePublicApiProviderStoragePaths,
  resolveLegacyPublicApiProviderStoragePaths,
} from '../../shared/runtime/appPaths.js'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export type PublicApiProviderConfig = {
  version: 1
  providerId: string
  secrets?: Record<string, string> | undefined
  persistence: {
    enabled: boolean
    defaultMode: 'online' | 'offline'
    maxEntries?: number | undefined
  }
}

export type ProviderConfigInput = {
  providerId: string
  persist?: boolean | undefined
  defaultMode?: 'online' | 'offline' | undefined
  secrets?: Record<string, string | undefined> | undefined
}

export type ProviderConfigResult = {
  kind: 'publicApis.config'
  providerId: string
  configFile: string
  databaseFile: string
  config: PublicApiProviderConfig
}

export async function readPublicApiProviderConfig(providerId: string): Promise<PublicApiProviderConfig> {
  const paths = resolvePublicApiProviderStoragePaths(providerId)
  try {
    const parsed = JSON.parse(await readFile(paths.configFile, 'utf8')) as Partial<PublicApiProviderConfig>
    return normalizeProviderConfig(providerId, parsed)
  } catch (error) {
    if (isMissingFileError(error)) {
      return await readLegacyPublicApiProviderConfig(providerId)
    }
    throw new RuntimeFailure('OPEN_API_FAILED', `Unable to read public API config for ${providerId}.`, {
      providerId,
      configFile: paths.configFile,
    })
  }
}

async function readLegacyPublicApiProviderConfig(
  providerId: string,
): Promise<PublicApiProviderConfig> {
  const paths = resolveLegacyPublicApiProviderStoragePaths(providerId)
  if (paths === undefined) return createDefaultProviderConfig(providerId)
  try {
    const parsed = JSON.parse(await readFile(paths.configFile, 'utf8')) as
      Partial<PublicApiProviderConfig>
    return normalizeProviderConfig(providerId, parsed)
  } catch (error) {
    if (isMissingFileError(error)) return createDefaultProviderConfig(providerId)
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      `Unable to read public API config for ${providerId}.`,
      {
        providerId,
        configFile: paths.configFile,
      },
    )
  }
}

export async function writePublicApiProviderConfig(input: ProviderConfigInput): Promise<ProviderConfigResult> {
  const paths = resolvePublicApiProviderStoragePaths(input.providerId)
  const current = await readPublicApiProviderConfig(input.providerId)
  const config: PublicApiProviderConfig = {
    ...current,
    ...mergeSecrets(current, input.secrets),
    persistence: {
      ...current.persistence,
      ...(input.persist !== undefined ? { enabled: input.persist } : {}),
      ...(input.defaultMode !== undefined ? { defaultMode: input.defaultMode } : {}),
    },
  }

  await mkdir(dirname(paths.configFile), { recursive: true, mode: 0o700 })
  await writeFile(paths.configFile, `${JSON.stringify(config, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 })
  await chmod(paths.configFile, 0o600)
  return {
    kind: 'publicApis.config',
    providerId: input.providerId,
    configFile: paths.configFile,
    databaseFile: paths.databaseFile,
    config: redactProviderConfig(config),
  }
}

export async function showPublicApiProviderConfig(providerId: string): Promise<ProviderConfigResult> {
  const paths = resolvePublicApiProviderStoragePaths(providerId)
  const config = await readPublicApiProviderConfig(providerId)
  return {
    kind: 'publicApis.config',
    providerId,
    configFile: paths.configFile,
    databaseFile: paths.databaseFile,
    config: redactProviderConfig(config),
  }
}

function createDefaultProviderConfig(providerId: string): PublicApiProviderConfig {
  return {
    version: 1,
    providerId,
    secrets: {},
    persistence: {
      enabled: false,
      defaultMode: 'online',
    },
  }
}

function normalizeProviderConfig(providerId: string, value: Partial<PublicApiProviderConfig>): PublicApiProviderConfig {
  const persistence = value.persistence
  const secrets = normalizeSecrets(value.secrets)
  return {
    version: 1,
    providerId,
    secrets,
    persistence: {
      enabled: persistence?.enabled === true,
      defaultMode: persistence?.defaultMode === 'offline' ? 'offline' : 'online',
      ...(typeof persistence?.maxEntries === 'number' ? { maxEntries: persistence.maxEntries } : {}),
    },
  }
}

function redactProviderConfig(config: PublicApiProviderConfig): PublicApiProviderConfig {
  return {
    ...config,
    secrets: Object.fromEntries(Object.keys(config.secrets ?? {}).map(key => [key, '<redacted>'])),
  }
}

function mergeSecrets(
  current: PublicApiProviderConfig,
  updates: Record<string, string | undefined> | undefined,
): Pick<PublicApiProviderConfig, 'secrets'> {
  if (updates === undefined) {
    return { secrets: current.secrets ?? {} }
  }

  const secrets = { ...(current.secrets ?? {}) }
  for (const [key, value] of Object.entries(updates)) {
    if (!isSafeSecretKey(key)) {
      throw new RuntimeFailure('INVALID_ARGUMENT', `Invalid secret key name: ${key}`, {
        key,
        remediation: 'Use names such as MEDIASTACK_API_KEY or accessKey.',
      })
    }
    if (value === undefined || value.trim() === '') {
      delete secrets[key]
      continue
    }
    secrets[key] = value.trim()
  }

  return { secrets }
}

function normalizeSecrets(value: unknown): Record<string, string> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  const secrets: Record<string, string> = {}
  for (const [key, rawValue] of Object.entries(value)) {
    if (isSafeSecretKey(key) && typeof rawValue === 'string' && rawValue.trim() !== '') {
      secrets[key] = rawValue.trim()
    }
  }
  return secrets
}

function isSafeSecretKey(value: string): boolean {
  return /^[A-Z][A-Z0-9_]*$/.test(value) || /^[a-z][A-Za-z0-9]*$/.test(value)
}

function isMissingFileError(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT'
}
