import type { Page } from 'puppeteer-core'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'
import { pressKey, typeIntoElement } from '../ui/elementActions.js'
import type { InspectHomeResult, SearchResult, SearchResultItem, SiteAdapter, SiteConfig } from './siteAdapter.js'

export class GenericSiteAdapter implements SiteAdapter {
  readonly config: SiteConfig

  constructor(config: SiteConfig) {
    this.config = config
  }

  async inspectHome(page: Page, mode: 'attached' | 'launched' | 'session'): Promise<InspectHomeResult> {
    await page.goto(this.config.baseUrl, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector(this.config.selectors.ready, { visible: true })

    return {
      site: this.config,
      url: page.url(),
      title: await page.title(),
      ready: true,
      readySelector: this.config.selectors.ready,
      mode,
    }
  }

  async search(page: Page, query: string): Promise<SearchResult> {
    if (this.config.selectors.searchInput === undefined) {
      throw new RuntimeFailure('SITE_ACTION_FAILED', 'This site adapter does not define a search input selector.', {
        site: this.config.id,
      })
    }

    await page.goto(this.config.baseUrl, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector(this.config.selectors.ready, { visible: true })
    await typeIntoElement(
      page,
      {
        selectors: [this.config.selectors.searchInput],
        kinds: ['input', 'textbox'],
      },
      query,
    )
    await pressKey(page, 'Enter')
    const networkIdle = await waitForNetworkIdle(page)

    const items = await collectResultItems(page, this.config.selectors.resultItems)
    return {
      site: this.config,
      query,
      url: page.url(),
      title: await page.title(),
      items,
      diagnostics: {
        networkIdle,
      },
    }
  }
}

async function waitForNetworkIdle(page: Page): Promise<SearchResult['diagnostics']['networkIdle']> {
  try {
    await page.waitForNetworkIdle({ idleTime: 500, timeout: 15_000 })
    return 'observed'
  } catch {
    return 'timeout'
  }
}

async function collectResultItems(page: Page, selector: string | undefined): Promise<SearchResultItem[]> {
  if (selector === undefined) {
    return []
  }

  return page.$$eval(selector, elements =>
    elements.slice(0, 10).map(element => {
      const anchor = element.querySelector('a')
      return {
        title: (anchor?.textContent ?? element.textContent ?? '').trim().slice(0, 200),
        text: (element.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 500),
        href: anchor instanceof HTMLAnchorElement ? anchor.href : undefined,
      }
    }),
  )
}
