import { test, expect } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'
import { Schema as S } from 'effect'

import ledger from '../../../research/catalogs/upstream-test-ledger.json' with { type: 'json' }

export type UpstreamHost = 'vanilla' | 'vue' | 'foldkit' | 'react'

export const boundingBox = async (element: Locator) => {
  const bounds = await element.boundingBox()

  if (bounds === null) {
    throw new Error('Upstream gesture target has no bounding box')
  }

  return bounds
}

export interface UpstreamHostAdapter {
  readonly host: UpstreamHost
  readonly baseURL: string
  readonly goto: (page: Page, path: string, classify?: boolean) => Promise<void>
  readonly selectors: { readonly edgePath: string; readonly handle: string }
  readonly nodeTransform: (element: Locator) => Promise<string>
  readonly edgeTarget: (element: Locator) => Locator
  readonly edgeClick: (
    element: Locator,
    options?: Parameters<Locator['click']>[0]
  ) => Promise<void>
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
  const resultFor = (entry: (typeof ledger.cases)[number]) =>
    host === 'react' ? entry.reference : entry.hosts[host]

  const baseURL = `http://127.0.0.1:${{ vanilla: 4176, vue: process.env.FLOW_VUE_TEST_PORT ?? 4177, foldkit: 4178, react: 4180 }[host]}`
  const prefix = host === 'vanilla' ? 'flow' : `flow-${host}`

  const edgeSelector =
    host === 'vanilla' ? '.flow-edge-group' : `.${prefix}-edge`

  const selectors = {
    'edge-path': `.${prefix}-edge-path`,
    node: `.${prefix}-node`,
    edge: edgeSelector,
    'edge-custom': `${edgeSelector}:has([data-component-custom-edge])`,
    'edge-invalid': `${edgeSelector}:has([data-component-invalid-edge])`,
    'edge-default': `${edgeSelector}:not(:has([data-component-custom-edge],[data-component-invalid-edge]))`,
    'edgelabel-renderer':
      '[data-testid="flow-edge-label-renderer"],.flow-vue-edge-label-renderer',
    handle: `.${prefix}-handle`,
    viewport: `.${prefix}-viewport`,
    pane: `.${prefix}-canvas`,
    selection: `.${prefix}-selection-rect`,
    nodesselection: `.${prefix}-selection-box`,
    'nodesselection-rect': `.${prefix}-selection-box`,
    renderer: `.${prefix}-canvas`,
    nodes: `.${prefix}-viewport`,
    controls: `.${prefix}-controls`,
    'controls-zoomin': `.${prefix}-controls button[aria-label="Zoom In"]`,
    'controls-zoomout': `.${prefix}-controls button[aria-label="Zoom Out"]`,
    'controls-fitview': `.${prefix}-controls button[aria-label="Fit View"]`,
    'controls-interactive': `.${prefix}-controls button[aria-label="Toggle Interactivity"]`,
    background: `.${prefix}-background`,
    minimap: host === 'vanilla' ? '.flow-minimap-panel' : `.${prefix}-minimap`,
    'minimap-node': `.${prefix}-minimap-node`,
    'minimap-mask': `.${prefix}-minimap-mask`,
    connectionline: `.${prefix}-connection-preview`,
    'node-toolbar': `.${prefix}-node-toolbar`,
  } satisfies Record<string, string>

  const map = (selector: string): string => {
    if (host === 'react') {
      return selector
    }

    return selector
      .replaceAll(
        '.react-flow__minimap svg',
        host === 'vanilla' ? '.flow-minimap-svg' : `.${prefix}-minimap`
      )
      .replaceAll(
        /\.react-flow__(?<control>ishidden|draggable|connectable|selectable|zoomonscroll|zoomondbl|captureelementclick)/gu,
        '[data-upstream-control="$1"]'
      )
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
  }

  const edgeTarget = (element: Locator) =>
    element
      .locator(
        {
          react: '.react-flow__edge-interaction',
          vanilla: '.flow-edge-hit',
          vue: '.flow-vue-edge-hit-target',
          foldkit: '.flow-foldkit-edge-hit-target',
        }[host]
      )
      .first()

  test.beforeEach(({ page }, info) => {
    void page

    const entry = ledger.cases.find((candidate) =>
      info.title.startsWith(`[${candidate.id}]`)
    )

    if (entry === undefined) {
      throw new Error(`Missing upstream ledger case: ${info.title}`)
    }

    const result = resultFor(entry)

    if (host === 'react') {
      test.fail(result.status === 'fail', entry.reference.reason)
    }

    test.skip(
      result.status === 'not-applicable',
      'reason' in result ? String(result.reason) : entry.id
    )
  })

  return {
    host,
    baseURL,
    selectors: {
      handle: host === 'react' ? '.react-flow__handle' : selectors.handle,
      edgePath:
        host === 'react'
          ? '.react-flow__edge-path'
          : (selectors['edge-path'] ?? ''),
    },
    goto: async (page, path, classify = true) => {
      await page.goto(`${baseURL}${path}`)
      await expect(
        page
          .locator(host === 'react' ? '.react-flow' : `.${prefix}-canvas`)
          .first()
      ).toBeVisible()

      if (!path.startsWith('/upstream-examples/')) {
        await expect(
          page
            .locator(host === 'react' ? '.react-flow__node' : `.${prefix}-node`)
            .first()
        ).toBeVisible()
      }

      if (host === 'foldkit' || path.startsWith('/upstream-examples/')) {
        await expect(page.locator('#app')).toHaveAttribute(
          'data-upstream-ready',
          'true'
        )
      }

      if (!classify) {
        return
      }

      const entry = ledger.cases.find((candidate) =>
        test.info().title.startsWith(`[${candidate.id}]`)
      )

      if (entry === undefined) {
        throw new Error('Missing upstream ledger entry')
      }

      const result = resultFor(entry)
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
    edgeTarget,
    edgeClick: (element, options) =>
      (host === 'foldkit' ? edgeTarget(element) : element).click(options),
    edgeBounds: (element) =>
      boundingBox(
        host === 'foldkit' ? element.locator(selectors['edge-path']) : element
      ),
    edgeLayer: (page, id) =>
      page
        .locator(
          host === 'react'
            ? `.react-flow__edge[data-id="${id}"]`
            : `${selectors.edge}[data-edge-id="${id}"]`
        )
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
