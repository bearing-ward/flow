import { expect, test } from '@playwright/test'

import type { FlowNodeRenderer } from '../src/mount-flow.ts'

test('Custom Node recipe updates displayed status and accepted data in place', async ({
  page,
}) => {
  await page.goto('/')

  await page.evaluate(async () => {
    const modulePath = '/src/public.ts'
    const { mountFlow } = await import(modulePath)
    const host = document.querySelector<HTMLElement>('#app')

    if (host === null) {
      throw new Error('Missing app host')
    }

    host.replaceChildren()

    // SAFETY: This nullable slot is assigned once before the mounted node can dispatch a click.
    const state = { controller: null as ReturnType<typeof mountFlow> | null }

    const renderer: FlowNodeRenderer = (node, content) => {
      const card = document.createElement('section')
      card.dataset.customNode = ''
      card.dataset.nodeId = node.id
      card.dataset.status = String(node.data?.['status'] ?? '')
      const title = document.createElement('h2')
      title.textContent = node.label
      const detail = document.createElement('p')
      detail.dataset.detail = ''
      detail.textContent = String(node.data?.['detail'] ?? '')
      const button = document.createElement('button')
      button.type = 'button'
      button.dataset.flowNoDrag = ''
      button.dataset.statusControl = ''
      button.textContent = String(node.data?.['status'] ?? '')

      button.addEventListener('click', () => {
        void state.controller?.updateNodeData(node.id, {
          status: 'ready',
          detail: 'All checks passed',
        })
      })

      card.append(title, detail, button)
      content.append(card)

      return {
        update: (next) => {
          card.dataset.status = String(next.data?.['status'] ?? '')
          detail.textContent = String(next.data?.['detail'] ?? '')
          button.textContent = String(next.data?.['status'] ?? '')
        },
        destroy: () => card.remove(),
      }
    }

    state.controller = mountFlow(
      host,
      {
        nodes: [
          {
            id: 'custom-status',
            label: 'Release check',
            type: 'custom-status',
            position: { x: 80, y: 90 },
            data: { status: 'waiting', detail: 'Build is queued' },
          },
        ],
        edges: [],
      },
      {
        documentMode: 'uncontrolled',
        nodeRenderers: { 'custom-status': renderer },
        viewport: {
          mode: 'uncontrolled',
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { minZoom: 0.5, maxZoom: 2 },
        },
      }
    )
  })

  const node = page.locator('.flow-node[data-node-id="custom-status"]')
  const card = node.locator('[data-custom-node]')

  const initialTransform = await node.evaluate(
    (element) => element.style.transform
  )

  const initialNode = await card.evaluate((element) => element)

  await expect(card.locator('h2')).toHaveText('Release check')
  await expect(card.locator('[data-detail]')).toHaveText('Build is queued')
  await expect(card).toHaveAttribute('data-status', 'waiting')

  await card.locator('[data-status-control]').click()

  await expect(card).toHaveAttribute('data-status', 'ready')
  await expect(card.locator('[data-status-control]')).toHaveText('ready')
  await expect(card.locator('[data-detail]')).toHaveText('All checks passed')
  expect(await node.evaluate((element) => element.style.transform)).toBe(
    initialTransform
  )
  expect(await card.evaluate((element) => element)).toBe(initialNode)
})
