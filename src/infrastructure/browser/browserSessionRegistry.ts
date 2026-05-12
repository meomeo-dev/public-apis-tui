import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { dirname, join } from 'node:path'
import { promisify } from 'node:util'
import type { Browser } from 'puppeteer-core'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'
import {
  DEFAULT_BROWSER_SESSION_ROOT_NAME,
  resolveAppHomeDir,
  resolveManagedBrowserSessionPaths,
} from '../../shared/runtime/appPaths.js'
import { ensureOwnerOnlyDirectories } from '../../shared/runtime/profileSecurity.js'

export const MANAGED_BROWSER_SESSION_STATE_VERSION = 1
const execFileAsync = promisify(execFile)

export type ManagedBrowserSessionState = {
  version: typeof MANAGED_BROWSER_SESSION_STATE_VERSION
  sessionId: string
  pid: number
  cdpUrl: string
  userDataDir: string
  chromeProfileDirectory?: string | undefined
  headless: boolean
  startedAt: string
  updatedAt: string
}

export type ManagedBrowserSessionStatus = 'running' | 'stale'

export type ManagedBrowserSessionListEntry = ManagedBrowserSessionState & {
  status: ManagedBrowserSessionStatus
  cdpReachable: boolean
}

export type StopManagedBrowserSessionResult = {
  sessionId: string
  status: 'stopped' | 'not-found' | 'stale-removed'
  pid?: number | undefined
  cdpUrl?: string | undefined
}

export type StopRecordedManagedBrowserProcessResult = {
  stopped: boolean
  stale: boolean
}

export function isValidBrowserSessionId(value: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/.test(value)
}

export function assertValidBrowserSessionId(sessionId: string): void {
  if (!isValidBrowserSessionId(sessionId)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `Invalid browser session id: ${sessionId}`, {
      expected: '1-64 characters: letters, numbers, dot, underscore, or dash; must start with a letter or number',
    })
  }
}

export async function readManagedBrowserSessionState(
  sessionId: string,
): Promise<ManagedBrowserSessionState | undefined> {
  assertValidBrowserSessionId(sessionId)
  return readStateFile(resolveManagedBrowserSessionPaths(sessionId).stateFile)
}

export async function writeManagedBrowserSessionState(state: ManagedBrowserSessionState): Promise<void> {
  assertValidBrowserSessionId(state.sessionId)
  const paths = resolveManagedBrowserSessionPaths(state.sessionId)
  const stateFile = paths.stateFile
  await ensureOwnerOnlyDirectories([paths.appHomeDir, paths.sessionRootDir, dirname(stateFile)])
  await writeFile(stateFile, `${JSON.stringify(state, null, 2)}\n`, 'utf8')
}

export async function removeManagedBrowserSessionState(sessionId: string): Promise<void> {
  assertValidBrowserSessionId(sessionId)
  await rm(resolveManagedBrowserSessionPaths(sessionId).stateFile, { force: true })
}

export async function listManagedBrowserSessions(): Promise<ManagedBrowserSessionListEntry[]> {
  const root = join(resolveAppHomeDir(), DEFAULT_BROWSER_SESSION_ROOT_NAME)
  if (!existsSync(root)) {
    return []
  }

  const entries = await readdir(root, { withFileTypes: true })
  const states = await Promise.all(
    entries
      .filter(entry => entry.isDirectory())
      .map(async entry => readStateFile(resolveManagedBrowserSessionPaths(entry.name).stateFile)),
  )
  const listEntries = await Promise.all(
    states
      .filter((state): state is ManagedBrowserSessionState => state !== undefined)
      .map(async state => {
        const cdpReachable = await isCdpReachable(state.cdpUrl)
        const status: ManagedBrowserSessionStatus = isPidAlive(state.pid) && cdpReachable ? 'running' : 'stale'
        return {
          ...state,
          status,
          cdpReachable,
        }
      }),
  )

  return listEntries.sort((left, right) => left.sessionId.localeCompare(right.sessionId))
}

export async function stopManagedBrowserSession(
  sessionId: string,
  options: {
    force?: boolean | undefined
    connect: (cdpUrl: string) => Promise<Browser>
  },
): Promise<StopManagedBrowserSessionResult> {
  assertValidBrowserSessionId(sessionId)
  const state = await readManagedBrowserSessionState(sessionId)
  if (state === undefined) {
    return {
      sessionId,
      status: 'not-found',
    }
  }

  if (!isPidAlive(state.pid)) {
    await removeManagedBrowserSessionState(sessionId)
    return {
      sessionId,
      status: 'stale-removed',
      pid: state.pid,
      cdpUrl: state.cdpUrl,
    }
  }

  if (!await isRecordedBrowserProcess(state)) {
    await removeManagedBrowserSessionState(sessionId)
    return {
      sessionId,
      status: 'stale-removed',
      pid: state.pid,
      cdpUrl: state.cdpUrl,
    }
  }

  if (await closeViaCdp(state.cdpUrl, options.connect)) {
    await removeManagedBrowserSessionState(sessionId)
    return {
      sessionId,
      status: 'stopped',
      pid: state.pid,
      cdpUrl: state.cdpUrl,
    }
  }

  await stopRecordedManagedBrowserProcess(state, { force: options.force })
  await removeManagedBrowserSessionState(sessionId)
  return {
    sessionId,
    status: 'stopped',
    pid: state.pid,
    cdpUrl: state.cdpUrl,
  }
}

export async function stopRecordedManagedBrowserProcess(
  state: ManagedBrowserSessionState,
  options: {
    force?: boolean | undefined
  } = {},
): Promise<StopRecordedManagedBrowserProcessResult> {
  if (!isPidAlive(state.pid) || !await isRecordedBrowserProcess(state)) {
    return {
      stopped: false,
      stale: true,
    }
  }

  await killPid(state.pid, options.force === true)
  return {
    stopped: true,
    stale: false,
  }
}

export function isPidAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false
  }

  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

export async function isCdpReachable(cdpUrl: string, timeoutMs = 1_000): Promise<boolean> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(new URL('/json/version', cdpUrl), {
      signal: controller.signal,
    })
    return response.ok
  } catch {
    return false
  } finally {
    clearTimeout(timeout)
  }
}

export async function allocateLocalPort(): Promise<number> {
  const server = createServer()
  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      server.close(error => {
        if (error !== undefined) {
          reject(error)
          return
        }
        if (address === null || typeof address === 'string') {
          reject(new Error('Failed to allocate a local TCP port.'))
          return
        }
        resolve(address.port)
      })
    })
  })
}

async function readStateFile(path: string): Promise<ManagedBrowserSessionState | undefined> {
  try {
    const parsed = JSON.parse(await readFile(path, 'utf8')) as Partial<ManagedBrowserSessionState>
    if (
      parsed.version !== MANAGED_BROWSER_SESSION_STATE_VERSION ||
      typeof parsed.sessionId !== 'string' ||
      typeof parsed.pid !== 'number' ||
      typeof parsed.cdpUrl !== 'string' ||
      typeof parsed.userDataDir !== 'string' ||
      typeof parsed.headless !== 'boolean' ||
      typeof parsed.startedAt !== 'string' ||
      typeof parsed.updatedAt !== 'string'
    ) {
      return undefined
    }

    return {
      version: MANAGED_BROWSER_SESSION_STATE_VERSION,
      sessionId: parsed.sessionId,
      pid: parsed.pid,
      cdpUrl: parsed.cdpUrl,
      userDataDir: parsed.userDataDir,
      ...(typeof parsed.chromeProfileDirectory === 'string'
        ? { chromeProfileDirectory: parsed.chromeProfileDirectory }
        : {}),
      headless: parsed.headless,
      startedAt: parsed.startedAt,
      updatedAt: parsed.updatedAt,
    }
  } catch {
    return undefined
  }
}

async function closeViaCdp(cdpUrl: string, connect: (cdpUrl: string) => Promise<Browser>): Promise<boolean> {
  try {
    const browser = await connect(cdpUrl)
    await browser.close()
    return true
  } catch {
    return false
  }
}

async function isRecordedBrowserProcess(state: ManagedBrowserSessionState): Promise<boolean> {
  const command = await readProcessCommand(state.pid)
  if (command === undefined) {
    return process.platform === 'win32'
  }

  const debuggingPort = new URL(state.cdpUrl).port
  return command.includes(state.userDataDir) || command.includes(`--remote-debugging-port=${debuggingPort}`)
}

async function readProcessCommand(pid: number): Promise<string | undefined> {
  if (process.platform === 'win32') {
    return undefined
  }

  try {
    const { stdout } = await execFileAsync('ps', ['-p', String(pid), '-o', 'command='])
    const command = stdout.trim()
    return command.length > 0 ? command : undefined
  } catch {
    return undefined
  }
}

async function killPid(pid: number, force: boolean): Promise<void> {
  const signal: NodeJS.Signals = force ? 'SIGKILL' : 'SIGTERM'
  try {
    if (process.platform !== 'win32') {
      try {
        process.kill(-pid, signal)
        return
      } catch {
        process.kill(pid, signal)
        return
      }
    }
    process.kill(pid, signal)
  } catch (error) {
    throw new RuntimeFailure('BROWSER_CONNECT_FAILED', `Failed to stop managed browser process ${pid}`, {
      pid,
      cause: error instanceof Error ? error.message : String(error),
    })
  }
}
