import type { ClickOptions, KeyInput, KeyPressOptions, KeyboardTypeOptions, Page } from 'puppeteer-core'
import type { BrowserInteractionConfig } from '../site/siteAdapter.js'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'
import { pickFirstEnabledCandidate, snapshotElements, type ElementCandidate, type ElementQuery } from './elementIntrospection.js'
import { getPageInteractionProfile } from './interactionProfile.js'

export type ElementActionResult = {
  action: 'click' | 'type' | 'press'
  target: ElementCandidate
}

export async function resolveElementOrThrow(page: Page, query: ElementQuery): Promise<ElementCandidate> {
  const snapshot = await snapshotElements(page, query)
  const candidate = pickFirstEnabledCandidate(snapshot)
  if (candidate === undefined) {
    throw new RuntimeFailure('SITE_ACTION_FAILED', 'No enabled visible element matched the requested query.', {
      query,
      candidateCount: snapshot.candidates.length,
    })
  }
  return candidate
}

export async function clickElement(
  page: Page,
  query: ElementQuery,
  interactionOverride?: BrowserInteractionConfig,
): Promise<ElementActionResult> {
  const target = await resolveElementOrThrow(page, query)
  const interaction = resolveInteraction(page, interactionOverride)
  await prepareForPointerAction(page, target.selector, interaction)
  await page.click(target.selector, toClickOptions(1, interaction.clickDelayMs))
  return { action: 'click', target }
}

export async function typeIntoElement(
  page: Page,
  query: ElementQuery,
  text: string,
  options: {
    clearFirst?: boolean | undefined
    interaction?: BrowserInteractionConfig | undefined
  } = {},
): Promise<ElementActionResult> {
  const target = await resolveElementOrThrow(page, query)
  const interaction = resolveInteraction(page, options.interaction)
  await prepareForPointerAction(page, target.selector, interaction)
  await page.click(
    target.selector,
    toClickOptions(options.clearFirst === false ? 1 : 3, interaction.clickDelayMs),
  )
  await page.keyboard.type(text, toTypeOptions(interaction.typeDelayMs))
  return { action: 'type', target }
}

export async function pressKey(
  page: Page,
  key: KeyInput,
  interactionOverride?: BrowserInteractionConfig,
): Promise<{ action: 'press'; key: KeyInput }> {
  const interaction = resolveInteraction(page, interactionOverride)
  await page.keyboard.press(key, toTypeOptions(interaction.pressDelayMs))
  return { action: 'press', key }
}

function resolveInteraction(page: Page, override: BrowserInteractionConfig | undefined): BrowserInteractionConfig {
  const base = getPageInteractionProfile(page)
  if (base === undefined) {
    return override ?? {}
  }
  if (override === undefined) {
    return base
  }

  return {
    hoverBeforeClick: override.hoverBeforeClick ?? base.hoverBeforeClick,
    scrollIntoView: override.scrollIntoView ?? base.scrollIntoView,
    clickDelayMs: override.clickDelayMs ?? base.clickDelayMs,
    typeDelayMs: override.typeDelayMs ?? base.typeDelayMs,
    pressDelayMs: override.pressDelayMs ?? base.pressDelayMs,
  }
}

async function prepareForPointerAction(
  page: Page,
  selector: string,
  interaction: BrowserInteractionConfig,
): Promise<void> {
  if (interaction.scrollIntoView === true) {
    await page.$eval(selector, element => {
      element.scrollIntoView({ block: 'center', inline: 'center' })
    })
  }

  if (interaction.hoverBeforeClick === true) {
    await page.hover(selector)
  }
}

function toClickOptions(clickCount: number, delayMs: number | undefined): ClickOptions {
  return delayMs === undefined ? { clickCount } : { clickCount, delay: delayMs }
}

function toTypeOptions(delayMs: number | undefined): KeyboardTypeOptions | KeyPressOptions | undefined {
  return delayMs === undefined ? undefined : { delay: delayMs }
}
