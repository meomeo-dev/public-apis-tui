import type { Page } from 'puppeteer-core'

export type SiteSelectors = {
  ready: string
  searchInput?: string | undefined
  resultItems?: string | undefined
}

export type SiteAuthMode = 'none' | 'optional' | 'required'

export type SiteAuthConfig = {
  mode: SiteAuthMode
  profileId?: string | undefined
  loginUrl?: string | undefined
  checkSelector?: string | undefined
  notes?: string[] | undefined
}

export type AuthProfileConfig = {
  id: string
  label: string
  description?: string | undefined
  userDataDir?: string | undefined
  profileDirectory?: string | undefined
  profile?: BrowserProfileConfig | undefined
  notes?: string[] | undefined
}

export type BrowserInteractionConfig = {
  hoverBeforeClick?: boolean | undefined
  scrollIntoView?: boolean | undefined
  clickDelayMs?: number | undefined
  typeDelayMs?: number | undefined
  pressDelayMs?: number | undefined
}

export type BrowserProfileConfig = {
  userAgent?: string | undefined
  locale?: string | undefined
  timezoneId?: string | undefined
  viewport?: {
    width: number
    height: number
    deviceScaleFactor?: number | undefined
    isMobile?: boolean | undefined
    hasTouch?: boolean | undefined
    isLandscape?: boolean | undefined
  } | undefined
  geolocation?: {
    latitude: number
    longitude: number
    accuracy?: number | undefined
  } | undefined
  extraHeaders?: Record<string, string> | undefined
  proxyServer?: string | undefined
  interaction?: BrowserInteractionConfig | undefined
}

export type SiteConfig = {
  id: string
  name: string
  baseUrl: string
  selectors: SiteSelectors
  auth: SiteAuthConfig
  roles: string[]
}

export type WorkflowStepKind = 'inspect' | 'search' | 'open'

export type WorkflowStepConfig = {
  id: string
  siteId: string
  kind: WorkflowStepKind
  description: string
  authProfileId?: string | undefined
}

export type WorkflowConfig = {
  id: string
  name: string
  description: string
  steps: WorkflowStepConfig[]
}

export type SiteRegistryConfig = {
  defaultSiteId: string
  authProfiles: AuthProfileConfig[]
  sites: SiteConfig[]
  workflows: WorkflowConfig[]
}

export type InspectHomeResult = {
  site: SiteConfig
  url: string
  title: string
  ready: boolean
  readySelector: string
  mode: 'attached' | 'launched' | 'session'
}

export type SearchResultItem = {
  title: string
  text: string
  href?: string | undefined
}

export type SearchResult = {
  site: SiteConfig
  query: string
  url: string
  title: string
  items: SearchResultItem[]
  diagnostics: {
    networkIdle: 'observed' | 'timeout'
  }
}

export interface SiteAdapter {
  readonly config: SiteConfig
  inspectHome(page: Page, mode: 'attached' | 'launched' | 'session'): Promise<InspectHomeResult>
  search(page: Page, query: string): Promise<SearchResult>
}
