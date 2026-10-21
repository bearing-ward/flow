import { test, expect } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'
import { Schema as S } from 'effect'

import ledger from '../../../research/catalogs/upstream-test-ledger.json' with { type: 'json' }

export type UpstreamHost = 'vanilla' | 'vue' | 'foldkit'

export const boundingBox = async (element: Locator) => {
  const bounds = await element.boundingBox()

  if (bounds === null) {
    throw new Error('Upstream gesture target has no bounding box')
  }

  return bounds
}

export interface UpstreamHostAdapter {
  readonly baseURL: string
  readonly goto: (page: Page, path: string) => Promise<void>
  readonly selectors: { readonly edgePath: string }
  readonly nodeTransform: (element: Locator) => Promise<string>
  readonly edgeClick: (element: Locator) => Promise<void>
  readonly edgeBounds: (element: Locator) => ReturnType<typeof boundingBox>
  readonly edgeLayer: (page: Page, id: string) => Locator
  readonly locator: (
    page: Page,
    selector: string,
    options?: Parameters<Page['locator']>[1]
  ) => Locator
}

export const upstreamHostAdapter = (
  host: UpstreamHost
): UpstreamHostAdapter => {
  const prefix = host === 'vanilla' ? 'flow' : `flow-${host}`

  const selectors = {
    'edge-path': `.${prefix}-edge-path`,
    node: `.${prefix}-node`,
    edge: host === 'vanilla' ? '.flow-edge-group' : `.${prefix}-edge`,
    handle: `.${prefix}-handle`,
    viewport: `.${prefix}-viewport`,
    pane: `.${prefix}-canvas`,
    selection: `.${prefix}-selection-rect`,
    nodesselection: `.${prefix}-selection-box`,
    'nodesselection-rect': `.${prefix}-selection-box`,
    connectionline: `.${prefix}-connection-preview`,
    'node-toolbar': `.${prefix}-node-toolbar`,
  } satisfies Record<string, string>

  const map = (selector: string): string =>
    selector
      .replaceAll(
        /\.(?:react|svelte)-flow__(?<part>[\w-]+)/gu,
        (original, key: string) =>
          Object.entries(selectors).find(([name]) => name === key)?.[1] ??
          original
      )
      .replaceAll('.react-flow', `.${prefix}-canvas`)
      .replaceAll(
        '#hidden-edge',
        `${selectors.edge}[data-edge-id="hidden-edge"]`
      )
      .replaceAll(
        /\[data-id="(?<id>[^"]+)"\]/gu,
        (_original, id: string) =>
          `:is(.${prefix}-node[data-node-id="${id}"],${selectors.edge}[data-edge-id="${id}"],.${prefix}-node-toolbar[data-node-toolbar="${id}"])`
      )
      .replaceAll(
        /\[data-nodeid="(?<node>[^"]+)"\]/gu,
        (_original, id: string) =>
          host === 'vanilla'
            ? `[data-node-id="${id}"]`
            : `.${prefix}-node[data-node-id="${id}"] .${prefix}-handle`
      )
      .replaceAll(
        '.source',
        host === 'vanilla'
          ? '[data-kind="source"]'
          : '[aria-label^="source handle"]'
      )

  test.beforeEach(({ page }, info) => {
    void page

    const entry = ledger.cases.find((candidate) =>
      info.title.startsWith(`[${candidate.id}]`)
    )

    if (entry === undefined) {
      throw new Error(`Missing upstream ledger case: ${info.title}`)
    }

    const result = entry.hosts[host]
    test.skip(
      result.status === 'not-applicable',
      'reason' in result ? String(result.reason) : entry.id
    )
  })

  return {
    baseURL: `http://127.0.0.1:${{ vanilla: 4176, vue: 4177, foldkit: 4178 }[host]}`,
    selectors: { edgePath: selectors['edge-path'] ?? '' },
    goto: async (page, path) => {
      await page.goto(
        `http://127.0.0.1:${{ vanilla: 4176, vue: 4177, foldkit: 4178 }[host]}${path}`
      )
      await expect(page.locator(`.${prefix}-canvas`)).toBeVisible()
      await expect(page.locator(`.${prefix}-node`).first()).toBeVisible()

      if (host === 'foldkit') {
        await expect(page.locator('#app')).toHaveAttribute(
          'data-upstream-ready',
          'true'
        )
      }

      const entry = ledger.cases.find((candidate) =>
        test.info().title.startsWith(`[${candidate.id}]`)
      )

      if (entry === undefined) {
        throw new Error('Missing upstream ledger entry')
      }

      const result = entry.hosts[host]
      test.fail(
        result.status === 'fail' || result.status === 'intentional-difference',
        `${entry.id}: ${'reason' in result ? String(result.reason) : result.status}`
      )
    },
    nodeTransform: (element) =>
      element.evaluate((el) => {
        if (!(el instanceof HTMLElement)) {
          throw new TypeError('Expected node element')
        }

        return (
          el.style.transform || `translate(${el.style.left},${el.style.top})`
        )
      }),
    locator: (page, selector, options) => page.locator(map(selector), options),
    edgeClick: (element) =>
      (host === 'foldkit'
        ? element.locator('.flow-foldkit-edge-hit-target')
        : element
      ).click(),
    edgeBounds: (element) =>
      boundingBox(
        host === 'foldkit' ? element.locator(selectors['edge-path']) : element
      ),
    edgeLayer: (page, id) =>
      page
        .locator(`${selectors.edge}[data-edge-id="${id}"]`)
        .locator('xpath=ancestor-or-self::*[local-name()="svg"][1]'),
  }
}

// Upstream: tests/playwright/e2e/utils.ts:1-17. Preserve its unsigned-number parser.
export const getTransform = async (element: Locator) => {
  const transformString = await element.evaluate((el) =>
    el instanceof HTMLElement ? el.style.transform : ''
  )

  const transforms = S.decodeUnknownSync(
    S.Array(S.String).check(S.isMinLength(3))
  )(transformString.match(/[\d.]+/gu))

  return {
    translateX: Number(transforms[0] ?? ''),
    translateY: Number(transforms[1] ?? ''),
    scale: Number(transforms[2] ?? ''),
  }
}
