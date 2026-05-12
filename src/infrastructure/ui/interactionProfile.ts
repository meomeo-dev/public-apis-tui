import type { Page } from 'puppeteer-core'
import type { BrowserInteractionConfig } from '../site/siteAdapter.js'

const interactionProfileKey = Symbol.for('site-cdp.browser-interaction-profile')

type PageWithInteractionProfile = Page & {
  [interactionProfileKey]?: BrowserInteractionConfig | undefined
}

export function setPageInteractionProfile(page: Page, profile: BrowserInteractionConfig | undefined): void {
  const target = page as PageWithInteractionProfile
  if (profile === undefined) {
    delete target[interactionProfileKey]
    return
  }

  target[interactionProfileKey] = profile
}

export function getPageInteractionProfile(page: Page): BrowserInteractionConfig | undefined {
  return (page as PageWithInteractionProfile)[interactionProfileKey]
}
