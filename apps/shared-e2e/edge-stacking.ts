import { expect, test } from '@playwright/test'
import type { Locator } from '@playwright/test'

const center = async (locator: Locator) => {
  const bounds = await locator.boundingBox()

  if (bounds === null) {
    throw new Error('Missing overlap bounds')
  }

  return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
}

export const edgeStackingContract = (host: 'vanilla' | 'vue' | 'foldkit') => {
  const prefix = host === 'vanilla' ? 'flow' : `flow-${host}`
  const edgeClass = host === 'vanilla' ? 'flow-edge-group' : `${prefix}-edge`

  for (const panOnDrag of [false, true]) {
    test(`built-in labels share edge hit order and exclude pane gestures, panOnDrag=${panOnDrag}`, async ({
      page,
    }) => {
      await page.goto(host === 'vanilla' ? '/' : '/test.html')
      await page.evaluate(() =>
        globalThis.dispatchEvent(new Event('beforeunload'))
      )
      await page.evaluate(async (pan) => {
        const modulePath = '/e2e/edge-stacking-fixture.ts'
        const { mountEdgeStackingFixture } = await import(modulePath)
        const root = document.querySelector<HTMLElement>('#app')

        if (root === null) {
          throw new Error('Missing stacking fixture root')
        }

        const style = document.createElement('style')
        style.textContent =
          'html,body,#app {margin:0;width:100%;height:100%} .flow-foldkit-root,.flow-foldkit-canvas {width:100%;height:100%}'
        document.head.append(style)
        mountEdgeStackingFixture(root, pan)
      }, panOnDrag)

      const label = page
        .locator(`.${prefix}-edge-label`)
        .filter({ hasText: 'Built-in label' })

      const cover = page.locator(`.${prefix}-node[data-node-id="cover"]`)
      const edge = page.locator(`.${edgeClass}[data-edge-id="edge"]`)
      const viewport = page.locator(`.${prefix}-viewport`).first()
      const point = await center(label)
      const original = await edge.elementHandle()

      const order = () =>
        page
          .locator(`.${edgeClass}`)
          .evaluateAll((elements) =>
            elements.map((element) => element.dataset.edgeId)
          )

      const stack = () =>
        page.evaluate(
          ({ x, y, labelSelector, edgeSelector }) => {
            const owners = document
              .elementsFromPoint(x, y)
              .flatMap((element) => {
                const node = element.closest<HTMLElement>('[data-node-id]')

                if (node !== null) {
                  return [`node:${node.dataset.nodeId}`]
                }

                if (element.closest(labelSelector) !== null) {
                  return ['label:edge']
                }

                const owner = element.closest<SVGElement>(edgeSelector)

                return owner === null ? [] : [`edge:${owner.dataset.edgeId}`]
              })

            return [...new Set(owners)]
          },
          {
            ...point,
            labelSelector: `.${prefix}-edge-label`,
            edgeSelector: `.${edgeClass}`,
          }
        )

      // Pinned GraphView/index.tsx:158-184 puts equal-level edges before nodes;
      // EdgeText's pointer-events:all remains inside its edge's stacking level.
      await expect(label).toHaveCSS('pointer-events', 'all')
      // Pinned EdgeLabelRenderer/index.tsx:48 keeps portal labels inert by default.
      await expect(page.getByTestId('default-portal-label')).toHaveCSS(
        'pointer-events',
        'none'
      )
      await expect
        .poll(stack)
        .toEqual(['node:cover', 'label:edge', 'edge:edge', 'edge:other'])
      const before = await stack()
      await page.mouse.click(point.x, point.y)
      await expect(cover).toHaveClass(/selected/u)
      await expect(edge).not.toHaveClass(/selected/u)
      await page.mouse.move(point.x, point.y)
      await page.mouse.down()
      await page.mouse.move(point.x, point.y + 100, { steps: 8 })
      await page.mouse.up()
      await expect
        .poll(async () => {
          const position = await center(cover)

          return position.y
        })
        .toBeGreaterThan(point.y + 90)

      const transform = await viewport.getAttribute('style')
      await page.mouse.move(point.x, point.y)
      await page.mouse.down()
      await page.mouse.move(point.x + 5, point.y + 2, { steps: 2 })
      await expect(page.locator(`.${prefix}-selection-rect`)).toHaveCount(0)
      await page.mouse.up()
      await expect(viewport).toHaveAttribute('style', transform ?? '')
      await page.mouse.click(point.x, point.y)
      await expect(edge).toHaveClass(/selected/u)
      await expect
        .poll(() =>
          page.evaluate(() => window.__flowEdgeStacking?.edgeClicks())
        )
        .toContain('edge')

      await page.evaluate(() => window.__flowEdgeStacking?.coverEdge(false))
      await expect(edge).not.toHaveClass(/selected/u)
      await expect
        .poll(stack)
        .toEqual(['node:cover', 'label:edge', 'edge:edge', 'edge:other'])

      const focusTarget =
        host === 'vanilla' ? edge : edge.locator(`.${prefix}-edge-hit-target`)

      await focusTarget.focus()
      await page.evaluate(() => window.__flowEdgeStacking?.coverEdge(true))
      await expect(focusTarget).toBeFocused()
      await expect
        .poll(stack)
        .toEqual(['label:edge', 'edge:edge', 'node:cover', 'edge:other'])
      await expect.poll(order).toEqual(['edge', 'other'])
      expect(
        await edge.evaluate(
          (element, retained) => element === retained,
          original
        )
      ).toBe(true)
      const after = await stack()

      if (host === 'vanilla') {
        // Pinned EdgeWrapper/index.tsx:251 renders reachable reconnect controls.
        // Flow retains attachment-centered controls in its host overlay.
        const anchor = page.locator(
          '.flow-edge-anchor-group[data-edge-id="edge"] [data-endpoint="source"]'
        )

        const endpoint = await center(anchor)

        const hit = await page.evaluate(
          ({ x, y }) =>
            document
              .elementFromPoint(x, y)
              ?.closest<SVGElement>('.flow-edge-reconnect-anchor')?.dataset
              .endpoint ?? null,
          endpoint
        )

        expect(hit).toBe('source')
      }

      // The label now wins over the covering node, as does the elevated path.
      const pathPoint = { x: point.x - 60, y: point.y }

      const pathOwner = await page.evaluate(
        ({ x, y, edgeSelector }) =>
          document
            .elementsFromPoint(x, y)
            .map(
              (element) =>
                element.closest<SVGElement>(`.${edgeSelector}`)?.dataset
                  .edgeId ??
                element.closest<HTMLElement>('[data-node-id]')?.dataset.nodeId
            )
            .filter(Boolean),
        { ...pathPoint, edgeSelector: edgeClass }
      )

      expect(pathOwner).toContain('edge')
      expect(pathOwner).toContain('cover')
      expect(pathOwner.indexOf('edge')).toBeLessThan(pathOwner.indexOf('cover'))
      await test.info().attach('overlap-hit-order', {
        body: JSON.stringify({
          host,
          panOnDrag,
          point,
          before,
          after,
          pathPoint,
          pathOwner,
        }),
        contentType: 'application/json',
      })

      // Pinned EdgeText.tsx:41 and init.css:160 also cover SVG labels in custom edges.
      const svgLabel = page
        .locator(`.${prefix}-edge-textwrapper`)
        .filter({ hasText: 'SVG built-in label' })

      await expect(svgLabel).toHaveCSS('pointer-events', 'all')
      const svgPoint = await center(svgLabel)
      await page.mouse.move(svgPoint.x, svgPoint.y)
      await page.mouse.down()
      await page.mouse.move(svgPoint.x + 5, svgPoint.y + 2, { steps: 2 })
      await expect(page.locator(`.${prefix}-selection-rect`)).toHaveCount(0)
      await page.mouse.up()
      await expect(viewport).toHaveAttribute('style', transform ?? '')
      await page.mouse.click(svgPoint.x, svgPoint.y)
      await expect(
        page.locator(`.${edgeClass}[data-edge-id="other"]`)
      ).toHaveClass(/selected/u)
      await expect
        .poll(() =>
          page.evaluate(() => window.__flowEdgeStacking?.edgeClicks())
        )
        .toContain('other')
      await expect(viewport).toHaveAttribute('style', transform ?? '')
      await expect(page.locator(`.${prefix}-selection-rect`)).toHaveCount(0)
    })
  }
}

export const vanillaPinnedEdgeOverlaps = () => {
  for (const { edgeId, nodeId, zIndex } of [
    { edgeId: 'z-index', nodeId: '3', zIndex: '3141592' },
    { edgeId: 'subflow-edge', nodeId: '12', zIndex: '1' },
    { edgeId: 'subflow-edge-2', nodeId: '12', zIndex: '1' },
  ]) {
    test(`pinned generic edge ${edgeId} paints above overlapping node ${nodeId}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1280, height: 720 })
      await page.goto('/upstream/edges/general')
      const edge = page.locator(`.flow-edge-group[data-edge-id="${edgeId}"]`)
      await expect(edge).toBeAttached()
      await expect(
        page.locator(`.flow-node[data-node-id="${nodeId}"]`)
      ).toBeInViewport({ ratio: 0.95 })
      await expect(edge.locator('xpath=..')).toHaveCSS('z-index', zIndex ?? '')

      if (edgeId === 'z-index') {
        // The current path stops outside node 8. Create a real overlap with an
        // unrelated node through native dragging, without mutating DOM styles.
        const coveringNode = page.locator(
          `.flow-node[data-node-id="${nodeId}"]`
        )

        const from = await center(coveringNode)

        const midpoint = await edge
          .locator('.flow-edge-path')
          .evaluate((element) => {
            if (!(element instanceof SVGPathElement)) {
              throw new TypeError('Missing overlap path')
            }

            const matrix = element.getScreenCTM()

            if (matrix === null) {
              throw new Error('Missing overlap CTM')
            }

            const point = element
              .getPointAtLength(element.getTotalLength() / 2)
              .matrixTransform(matrix)

            return { x: point.x, y: point.y }
          })

        await page.mouse.move(from.x, from.y)
        await page.mouse.down()
        await page.mouse.move(midpoint.x, midpoint.y, { steps: 8 })
        await page.mouse.up()
        await expect
          .poll(async () => {
            const actual = await center(coveringNode)

            return Math.hypot(actual.x - midpoint.x, actual.y - midpoint.y)
          })
          .toBeLessThan(2)
      }

      // Pinned EdgeWrapper/index.tsx:184 and getElevatedEdgeZIndex general.ts:40.
      // Measure the actual generic-fixture overlap, separately from the synthetic selection fixture.
      const receipt = await page.evaluate(
        ({ edgeId: edgeKey, nodeId: nodeKey }) => {
          const path = document.querySelector(
            `.flow-edge-group[data-edge-id="${edgeKey}"] .flow-edge-path`
          )

          const node = document.querySelector(
            `.flow-node[data-node-id="${nodeKey}"]`
          )

          if (!(path instanceof SVGPathElement) || node === null) {
            throw new Error('Missing pinned overlap fixture')
          }

          const matrix = path.getScreenCTM()

          if (matrix === null) {
            throw new Error('Missing edge screen matrix')
          }

          const bounds = node.getBoundingClientRect()
          const length = path.getTotalLength()

          const halfStroke =
            (Number(getComputedStyle(path).strokeWidth.replace('px', '')) *
              Math.hypot(matrix.a, matrix.b)) /
            2

          if (!Number.isFinite(halfStroke) || halfStroke <= 0) {
            throw new Error('Pinned edge has no measurable painted stroke')
          }

          for (let index = 1; index < 1000; index += 1) {
            const point = path
              .getPointAtLength((length * index) / 1000)
              .matrixTransform(matrix)

            // Include painted border overlaps, including a horizontal path whose
            // bounding box has zero height. Stay inside its visible stroke.
            const x = Math.max(
              bounds.left + 0.25,
              Math.min(bounds.right - 0.25, point.x)
            )

            const y = Math.max(
              bounds.top + 0.25,
              Math.min(bounds.bottom - 0.25, point.y)
            )

            const strokeOffset = Math.hypot(x - point.x, y - point.y)

            if (strokeOffset > halfStroke * 0.9) {
              continue
            }

            const owners = [
              ...new Set(
                document.elementsFromPoint(x, y).flatMap((element) => {
                  const edgeOwner =
                    element.closest<SVGElement>('.flow-edge-group')

                  if (edgeOwner !== null) {
                    return [`edge:${edgeOwner.dataset.edgeId}`]
                  }

                  const nodeOwner = element.closest<HTMLElement>('.flow-node')

                  return nodeOwner === null
                    ? []
                    : [`node:${nodeOwner.dataset.nodeId}`]
                })
              ),
            ]

            const edgeIndex = owners.indexOf(`edge:${edgeKey}`)
            const nodeIndex = owners.indexOf(`node:${nodeKey}`)

            if (edgeIndex === -1 || nodeIndex === -1) {
              continue
            }

            if (
              owners
                .slice(0, edgeIndex)
                .some((owner) => owner.startsWith('node:'))
            ) {
              continue
            }

            return {
              point: { x, y },
              strokeOffset,
              halfStroke,
              owners,
              edgeIndex,
              nodeIndex,
              stroke: getComputedStyle(path).stroke,
            }
          }

          return null
        },
        { edgeId, nodeId }
      )

      expect(receipt).not.toBeNull()
      expect(receipt?.edgeIndex).toBeLessThan(receipt?.nodeIndex ?? -1)
      expect(receipt?.stroke).not.toBe('none')
      await test.info().attach('pinned-overlap-hit-order', {
        body: JSON.stringify({ edgeId, nodeId, zIndex, ...receipt }),
        contentType: 'application/json',
      })
    })
  }
}
