import { expect as playwrightExpect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

import ledger from '../../../research/catalogs/upstream-test-ledger.json' with { type: 'json' }
import type { ComponentReceipt } from '../../shared/upstream/component.ts'
import { drag as sourceDrag } from '../upstream-cypress/helpers.ts'
import type { UpstreamHostAdapter } from '../upstream/adapter.ts'

// Cypress v13.6.6 defaultCommandTimeout is 4000ms.
export const expect = playwrightExpect.configure({ timeout: 4000 })

// examples/react/cypress/support/commands.ts:1-58, ported once in Plan 134.
export {
  handleSelector,
  dragPane,
  zoomPane,
  trigger,
  isWithinViewport,
  transform,
  transformRetained,
} from '../upstream-cypress/helpers.ts'

export const componentMount = async (
  page: Page,
  adapter: UpstreamHostAdapter,
  id: number
) => {
  page.setDefaultTimeout(4000)
  page.setDefaultNavigationTimeout(30_000)
  expect(page.viewportSize()).toEqual({ width: 500, height: 500 })
  await page.goto(`${adapter.baseURL}/upstream-component/${id}`)

  await expect(page.locator('#app')).toHaveAttribute(
    'data-upstream-ready',
    'true'
  )

  const entry = ledger.cases.find(
    (c) => c.id === `UP-128-${String(id).padStart(3, '0')}`
  )

  if (!entry) {
    throw new Error(`Missing component ledger ${id}`)
  }

  const result =
    adapter.host === 'react' ? entry.reference : entry.hosts[adapter.host]

  test.skip(
    result.status === 'not-applicable',
    'reason' in result ? result.reason : entry.id
  )
  test.fail(
    result.status === 'fail' || result.status === 'intentional-difference',
    'reason' in result ? result.reason : entry.id
  )
}

export const receipt = (page: Page) => page.evaluate(() => window.__component)

export const history = <K extends keyof ComponentReceipt>(page: Page, key: K) =>
  page.evaluate((k) => window.__component[k], key)

export const eventCount = (page: Page, name: string) =>
  page.evaluate((key) => window.__component.events[key] ?? 0, name)

export const latestViewport = (page: Page) =>
  page.evaluate(() => window.__component.viewports.at(-1))

export const nodeSnapshot = (page: Page, adapter: UpstreamHostAdapter) => {
  if (adapter.host === 'react') {
    return history(page, 'nodes')
  }

  return page.evaluate(() =>
    window.__component.nodes.map((value) => {
      if (!Array.isArray(value)) {
        return value
      }

      return value.map((node) => {
        const { label, sourcePosition, targetPosition, ...rest } = node
        void label
        void sourcePosition
        void targetPosition

        return rest
      })
    })
  )
}

// Translate only Flow's node metadata extensions. Keep every upstream payload
// field and object equality, including the observer's retained measured object.
export const nodeChangeSnapshot = (
  page: Page,
  adapter: UpstreamHostAdapter
) => {
  if (adapter.host === 'react') {
    return history(page, 'nodeChanges')
  }

  return page.evaluate(() =>
    window.__component.nodeChanges.map((batch) => {
      if (!Array.isArray(batch)) {
        return batch
      }

      return batch.map((change) => {
        if (change.type !== 'replace') {
          return change
        }

        const { label, sourcePosition, targetPosition, ...item } = change.item
        void label
        void sourcePosition
        void targetPosition

        return { ...change, item }
      })
    })
  )
}

export const expectedNodes = [
  {
    id: '1',
    data: { label: 'Node 1' },
    position: { x: 0, y: 0 },
    style: { width: 100, height: 50 },
    measured: { width: 100, height: 50 },
  },
  {
    id: '2',
    data: { label: 'Node 2' },
    position: { x: 200, y: 200 },
    style: { width: 100, height: 50 },
    measured: { width: 100, height: 50 },
  },
]

// Retain the complete public callback and DOM state when an assertion fails.
export const componentEvidence = () =>
  test.afterEach(async ({ page }, info) => {
    if (info.status === 'failed' || info.status === 'timedOut') {
      await info.attach('component-public-api-evidence', {
        body: JSON.stringify(
          await page.evaluate(() => ({
            receipt: window.__component,
            crash: [...document.querySelectorAll('h1')].find(
              (el) => el.textContent === 'Application Crash'
            )?.parentElement?.textContent,
            browser: { width: window.innerWidth, height: window.innerHeight },
            canvases: [
              ...document.querySelectorAll<HTMLElement>(
                '.flow-canvas,.flow-vue-canvas,.flow-foldkit-canvas,.react-flow'
              ),
            ].map((el) => ({
              bounds: el.getBoundingClientRect().toJSON(),
              html: el.outerHTML.slice(0, 400),
            })),
            nodes: [
              ...document.querySelectorAll<HTMLElement>(
                '.flow-node,.flow-vue-node,.flow-foldkit-node,.react-flow__node'
              ),
            ].map((n) => ({
              html: n.outerHTML,
              bounds: n.getBoundingClientRect().toJSON(),
            })),
            viewports: [
              ...document.querySelectorAll(
                '[class$="-viewport"],.react-flow__viewport'
              ),
            ].map((n) => n.getAttribute('style')),
          })),
          null,
          2
        ),
        contentType: 'application/json',
      })
    }
  })

export { boundingBox } from '../upstream/adapter.ts'

// ControlledFlow.tsx:16-69 uses synchronous React changes. Foldkit's public
// instance query is the FIFO barrier after native release; wait for its view frame.
export const drag = async (...args: Parameters<typeof sourceDrag>) => {
  const subject = await sourceDrag(...args)
  const [page] = args

  if (page.url().startsWith('http://127.0.0.1:4178/')) {
    await page.evaluate(async () => {
      await window.__componentSettle?.()
    })
  }

  return subject
}
