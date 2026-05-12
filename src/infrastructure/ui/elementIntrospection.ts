import type { Page } from 'puppeteer-core'

export type ElementCandidateKind = 'button' | 'input' | 'textbox' | 'link' | 'file-input' | 'menuitem' | 'unknown'

export type ElementCandidate = {
  selector: string
  label: string | null
  text: string | null
  role: string | null
  tagName: string
  kind: ElementCandidateKind
  visible: boolean
  disabled: boolean
  checked?: boolean | undefined
}

export type ElementQuery = {
  selectors?: string[] | undefined
  labels?: string[] | undefined
  kinds?: ElementCandidateKind[] | undefined
  visibleOnly?: boolean | undefined
}

export type ElementSnapshot = {
  candidates: ElementCandidate[]
}

export async function snapshotElements(page: Page, query: ElementQuery = {}): Promise<ElementSnapshot> {
  return page.evaluate(
    ({ selectors, labels, kinds, visibleOnly }) => {
      const normalize = (value: string | null | undefined): string => (value ?? '').replace(/\s+/g, ' ').trim()
      const escapeSelectorValue = (value: string): string => {
        if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
          return CSS.escape(value)
        }
        return value.replace(/["\\]/g, '\\$&')
      }
      const hasHiddenAncestor = (element: Element): boolean =>
        Boolean(element.closest('[hidden], [inert], [aria-hidden="true"]'))
      const isVisible = (element: Element): boolean => {
        if (!(element instanceof HTMLElement)) {
          return true
        }
        if (element.hidden || hasHiddenAncestor(element)) {
          return false
        }
        const style = window.getComputedStyle(element)
        if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') {
          return false
        }
        if (Number.parseFloat(style.opacity || '1') === 0) {
          return false
        }
        const rect = element.getBoundingClientRect()
        return rect.width > 0 && rect.height > 0
      }
      const inferSelector = (element: Element): string => {
        if (element.id) {
          return `#${escapeSelectorValue(element.id)}`
        }
        const testId = element.getAttribute('data-testid')
        if (testId) {
          return `[data-testid="${escapeSelectorValue(testId)}"]`
        }
        const ariaLabel = element.getAttribute('aria-label')
        if (ariaLabel && (element.tagName === 'BUTTON' || element.getAttribute('role') === 'button')) {
          return `${element.tagName.toLowerCase()}[aria-label="${escapeSelectorValue(ariaLabel)}"]`
        }
        if (element instanceof HTMLInputElement && element.name) {
          return `input[name="${escapeSelectorValue(element.name)}"]`
        }
        if (element instanceof HTMLTextAreaElement && element.name) {
          return `textarea[name="${escapeSelectorValue(element.name)}"]`
        }
        const role = element.getAttribute('role')
        if (role) {
          return `[role="${escapeSelectorValue(role)}"]`
        }
        return element.tagName.toLowerCase()
      }
      const readLabel = (element: Element): string =>
        normalize(
          [
            element.getAttribute('aria-label'),
            element.getAttribute('title'),
            element.getAttribute('data-testid'),
            element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement
              ? element.placeholder
              : null,
            element.querySelector('svg title')?.textContent,
            element.textContent,
          ]
            .filter(Boolean)
            .join(' '),
        )
      const inferKind = (element: Element): ElementCandidateKind => {
        if (element instanceof HTMLInputElement && element.type === 'file') return 'file-input'
        if (element instanceof HTMLInputElement) return 'input'
        if (element instanceof HTMLTextAreaElement) return 'textbox'
        if (element.getAttribute('contenteditable') === 'true') return 'textbox'
        if (element.getAttribute('contenteditable') === 'plaintext-only') return 'textbox'
        if (element.getAttribute('role') === 'textbox') return 'textbox'
        if (element.tagName === 'BUTTON' || element.getAttribute('role') === 'button') return 'button'
        if (element.tagName === 'A') return 'link'
        if (element.getAttribute('role') === 'menuitem') return 'menuitem'
        return 'unknown'
      }
      const isDisabled = (element: Element): boolean => {
        if (element instanceof HTMLButtonElement || element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
          return element.disabled
        }
        return element.getAttribute('aria-disabled') === 'true'
      }
      const readChecked = (element: Element): boolean | undefined => {
        if (element instanceof HTMLInputElement && (element.type === 'checkbox' || element.type === 'radio')) {
          return element.checked
        }
        const ariaChecked = element.getAttribute('aria-checked')
        if (ariaChecked === 'true') return true
        if (ariaChecked === 'false') return false
        const ariaPressed = element.getAttribute('aria-pressed')
        if (ariaPressed === 'true') return true
        if (ariaPressed === 'false') return false
        return undefined
      }
      const selectorList = selectors?.length
        ? selectors
        : [
            'button',
            '[role="button"]',
            'input',
            'textarea',
            '[contenteditable="true"]',
            '[contenteditable="plaintext-only"]',
            '[role="textbox"]',
            'a[href]',
            '[role="menuitem"]',
          ]
      const labelNeedles = (labels ?? []).map(label => normalize(label).toLowerCase()).filter(Boolean)
      const kindSet = new Set(kinds ?? [])
      const seen = new Set<Element>()
      const candidates: ElementCandidate[] = []

      for (const selector of selectorList) {
        for (const element of Array.from(document.querySelectorAll(selector))) {
          if (seen.has(element)) continue
          seen.add(element)
          const visible = isVisible(element)
          if (visibleOnly !== false && !visible) continue
          const kind = inferKind(element)
          if (kindSet.size > 0 && !kindSet.has(kind)) continue
          const label = readLabel(element)
          if (labelNeedles.length > 0 && !labelNeedles.some(needle => label.toLowerCase().includes(needle))) {
            continue
          }
          candidates.push({
            selector: inferSelector(element),
            label: label || null,
            text: normalize(element.textContent) || null,
            role: element.getAttribute('role'),
            tagName: element.tagName.toLowerCase(),
            kind,
            visible,
            disabled: isDisabled(element),
            checked: readChecked(element),
          })
        }
      }

      return { candidates }
    },
    query,
  )
}

export function pickFirstEnabledCandidate(snapshot: ElementSnapshot): ElementCandidate | undefined {
  return snapshot.candidates.find(candidate => candidate.visible && !candidate.disabled)
}
