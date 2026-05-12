import puppeteer, { type Browser } from 'puppeteer-core'
import {
  listManagedBrowserSessions,
  stopManagedBrowserSession,
  type ManagedBrowserSessionListEntry,
  type StopManagedBrowserSessionResult,
} from '../../infrastructure/browser/browserSessionRegistry.js'

export type ListBrowserSessionsResult = {
  sessions: ManagedBrowserSessionListEntry[]
}

export async function listBrowserSessions(): Promise<ListBrowserSessionsResult> {
  return {
    sessions: await listManagedBrowserSessions(),
  }
}

export async function stopBrowserSession(
  sessionId: string,
  options: {
    force?: boolean | undefined
    timeoutMs?: number | undefined
  } = {},
): Promise<StopManagedBrowserSessionResult> {
  return stopManagedBrowserSession(sessionId, {
    force: options.force,
    connect: cdpUrl => connectForShutdown(cdpUrl, options.timeoutMs ?? 5_000),
  })
}

async function connectForShutdown(cdpUrl: string, timeoutMs: number): Promise<Browser> {
  return puppeteer.connect({ browserURL: cdpUrl, protocolTimeout: timeoutMs })
}
