import { existsSync, readFileSync } from 'node:fs'
import {
  resolveLegacyManagedAuthProfilePaths,
  resolveManagedAuthProfilePaths,
} from './appPaths.js'

export type ManagedAuthState = {
  version: number
  status: 'ready'
  siteId?: string | undefined
  authProfileId: string
  loginUrl?: string | undefined
  finalUrl?: string | undefined
  chromeUserDataDir: string
  chromeProfileDirectory?: string | undefined
  loggedInAt?: string | undefined
  clonedAt?: string | undefined
  sourceUserDataDir?: string | undefined
}

export function readManagedAuthState(profileId: string): ManagedAuthState | undefined {
  const currentStateFile = resolveManagedAuthProfilePaths(profileId).stateFile
  const stateFiles = [
    currentStateFile,
    resolveLegacyManagedAuthProfilePaths(profileId)?.stateFile,
  ].filter((stateFile): stateFile is string => stateFile !== undefined)

  for (const stateFile of stateFiles) {
    const state = readManagedAuthStateFile(stateFile)
    if (state !== undefined) {
      return state
    }
  }

  return undefined
}

function readManagedAuthStateFile(stateFile: string): ManagedAuthState | undefined {
  if (!existsSync(stateFile)) {
    return undefined
  }
  try {
    const parsed = JSON.parse(
      readFileSync(stateFile, 'utf8'),
    ) as Partial<ManagedAuthState>
    if (
      parsed.status !== 'ready' ||
      typeof parsed.authProfileId !== 'string' ||
      typeof parsed.chromeUserDataDir !== 'string'
    ) {
      return undefined
    }

    return {
      version: typeof parsed.version === 'number' ? parsed.version : 1,
      status: 'ready',
      authProfileId: parsed.authProfileId,
      ...(typeof parsed.siteId === 'string' ? { siteId: parsed.siteId } : {}),
      ...(typeof parsed.loginUrl === 'string' ? { loginUrl: parsed.loginUrl } : {}),
      ...(typeof parsed.finalUrl === 'string' ? { finalUrl: parsed.finalUrl } : {}),
      chromeUserDataDir: parsed.chromeUserDataDir,
      ...(typeof parsed.chromeProfileDirectory === 'string'
        ? { chromeProfileDirectory: parsed.chromeProfileDirectory }
        : {}),
      ...(typeof parsed.loggedInAt === 'string'
        ? { loggedInAt: parsed.loggedInAt }
        : {}),
      ...(typeof parsed.clonedAt === 'string' ? { clonedAt: parsed.clonedAt } : {}),
      ...(typeof parsed.sourceUserDataDir === 'string'
        ? { sourceUserDataDir: parsed.sourceUserDataDir }
        : {}),
    }
  } catch {
    return undefined
  }
}
