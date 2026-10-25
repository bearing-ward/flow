import { test } from '@playwright/test'
import type { Page } from '@playwright/test'

import type { UpstreamHostAdapter } from '../upstream/adapter.ts'
import {
  expect,
  componentMount,
  history,
  drag,
  trigger,
  handleSelector,
  transform,
  transformRetained,
} from './helpers.ts'

export const componentsContract = (adapter: UpstreamHostAdapter) => {
  const get = (page: Page, selector: string) => adapter.locator(page, selector)
  // examples/react/cypress/components/reactflow/basic-props.cy.tsx:12
  test('[UP-128-017] mounts nodes and edges', async ({ page }) => {
    await componentMount(page, adapter, 17)
    await expect(get(page, '.react-flow__node')).toHaveCount(2)
    await expect(get(page, '.react-flow__edge')).toHaveCount(1)
  })

  // examples/react/cypress/components/reactflow/basic-props.cy.tsx:17
  test('[UP-128-018] drags a node', async ({ page }) => {
    await componentMount(page, adapter, 18)
    const node = get(page, '.react-flow__node').first()
    const before = await transform(node)
    const subject = await drag(page, node, { x: 200, y: 25 })
    expect(await transformRetained(subject)).not.toEqual(before)
  })

  // examples/react/cypress/components/reactflow/basic-props.cy.tsx:38
  test('[UP-128-019] mounts nodes and edges', async ({ page }) => {
    await componentMount(page, adapter, 19)
    await expect(get(page, '.react-flow__node')).toHaveCount(2)
    await expect(get(page, '.react-flow__edge')).toHaveCount(1)
  })

  // examples/react/cypress/components/reactflow/basic-props.cy.tsx:43
  test('[UP-128-020] can not drag a node', async ({ page }) => {
    await componentMount(page, adapter, 20)
    const node = get(page, '.react-flow__node').first()
    const before = await transform(node)
    const subject = await drag(page, node, { x: 200, y: 25 })
    expect(await transformRetained(subject)).toEqual(before)
  })

  // examples/react/cypress/components/reactflow/basic-props.cy.tsx:58
  test('[UP-128-021] mounts nodes', async ({ page }) => {
    await componentMount(page, adapter, 21)
    await expect(get(page, '.react-flow__node')).toHaveCount(2)
    await expect(get(page, '.react-flow__edge')).toHaveCount(0)
  })

  // examples/react/cypress/components/reactflow/basic-props.cy.tsx:63
  test('[UP-128-022] drags a node', async ({ page }) => {
    await componentMount(page, adapter, 22)
    const node = get(page, '.react-flow__node').first()
    const before = await transform(node)
    const subject = await drag(page, node, { x: 200, y: 25 })
    expect(await transformRetained(subject)).not.toEqual(before)
  })

  // examples/react/cypress/components/reactflow/basic-props.cy.tsx:72
  test('[UP-128-023] can not connect nodes', async ({ page }) => {
    await componentMount(page, adapter, 23)

    const source = get(page, '.react-flow__node')
      .first()
      .locator(handleSelector(adapter, 'source'))

    const target = get(page, '.react-flow__node')
      .last()
      .locator(handleSelector(adapter, 'target'))

    await trigger(page, source, 'mousedown')
    await trigger(page, target, 'mousemove')
    await trigger(page, target, 'mouseup')
    await expect(get(page, '.react-flow__edge')).toHaveCount(0)
  })

  // examples/react/cypress/components/reactflow/basic-props.cy.tsx:90
  test('[UP-128-024] mounts nodes and edges', async ({ page }) => {
    await componentMount(page, adapter, 24)
    await expect(get(page, '.react-flow__node')).toHaveCount(2)
    await expect(get(page, '.react-flow__edge')).toHaveCount(1)
  })

  // examples/react/cypress/components/reactflow/basic-props.cy.tsx:95
  test('[UP-128-025] selects an edge', async ({ page }) => {
    await componentMount(page, adapter, 25)
    const edge = get(page, '.react-flow__edge').first()
    await adapter.edgeClick(edge)
    await expect(edge).toHaveClass(/selected/u)
  })

  // examples/react/cypress/components/reactflow/basic-props.cy.tsx:105
  test('[UP-128-026] mounts nodes', async ({ page }) => {
    await componentMount(page, adapter, 26)
    await expect(get(page, '.react-flow__node')).toHaveCount(2)
    await expect(get(page, '.react-flow__edge')).toHaveCount(0)
  })

  // examples/react/cypress/components/reactflow/basic-props.cy.tsx:110
  test('[UP-128-027] connects nodes', async ({ page }) => {
    await componentMount(page, adapter, 27)

    const source = get(page, '.react-flow__node')
      .first()
      .locator(handleSelector(adapter, 'source'))

    const target = get(page, '.react-flow__node')
      .last()
      .locator(handleSelector(adapter, 'target'))

    await trigger(page, source, 'mousedown')
    await trigger(page, target, 'mousemove')
    await trigger(page, target, 'mouseup')
    await expect(get(page, '.react-flow__edge')).toHaveCount(1)
  })

  // examples/react/cypress/components/reactflow/basic-props.cy.tsx:124
  test('[UP-128-028] renders custom nodes', async ({ page }) => {
    await componentMount(page, adapter, 28)
    await expect(
      get(page, '.react-flow__node').filter({
        has: page.locator('.customnode'),
      })
    ).toHaveCount(2)
    await expect(get(page, '.react-flow')).toContainText('custom node')
  })

  // examples/react/cypress/components/reactflow/basic-props.cy.tsx:140
  test('[UP-128-029] tries invalid node type - should fallback to default', async ({
    page,
  }) => {
    await componentMount(page, adapter, 29)
    await expect(
      get(page, '.react-flow__node').filter({
        has: page.locator('.invalidnode'),
      })
    ).toHaveCount(0)
    await expect(
      get(page, '.react-flow__node').filter({
        hasNot: page.locator('.customnode'),
      })
    ).toHaveCount(2)
    await expect(get(page, '.react-flow__node')).toContainText([
      'Node 1',
      'Node 2',
    ])
  })

  // examples/react/cypress/components/reactflow/basic-props.cy.tsx:154
  test('[UP-128-030] renders custom edge', async ({ page }) => {
    await componentMount(page, adapter, 30)
    await expect(get(page, '.react-flow__edge-custom')).toHaveCount(1)
  })

  // examples/react/cypress/components/reactflow/basic-props.cy.tsx:171
  test('[UP-128-031] tries invalid edge type - should fallback to default', async ({
    page,
  }) => {
    await componentMount(page, adapter, 31)
    await expect(get(page, '.react-flow__edge-invalid')).toHaveCount(0)
    await expect(get(page, '.react-flow__edge-default')).toHaveCount(1)
    await expect(
      get(page, '.react-flow__edge').locator(adapter.selectors.edgePath)
    ).toHaveCount(1)
  })

  // examples/react/cypress/components/reactflow/basic-props.cy.tsx:184
  test('[UP-128-032] uses style', async ({ page }) => {
    await componentMount(page, adapter, 32)
    await expect(get(page, '.react-flow')).toHaveCSS(
      'background-color',
      'rgb(255, 0, 0)'
    )
  })

  // examples/react/cypress/components/reactflow/basic-props.cy.tsx:193
  test('[UP-128-033] uses classname', async ({ page }) => {
    await componentMount(page, adapter, 33)
    await expect(get(page, '.react-flow')).toHaveClass(/custom/u)
  })

  // examples/react/cypress/components/reactflow/multiple-instance.cy.tsx:47
  test('[UP-128-042] Each ReactFlow instance has one edge label in EdgeLabelRenderer', async ({
    page,
  }) => {
    await componentMount(page, adapter, 42)

    const layers = get(page, '.react-flow__edgelabel-renderer')

    await expect(layers).toHaveCount(2)
    await expect(layers.nth(0).locator('.label')).toHaveCount(1)
    await expect(layers.nth(0).locator('.label')).toContainText('edge1')
    await expect(layers.nth(1).locator('.label')).toHaveCount(1)
    await expect(layers.nth(1).locator('.label')).toContainText('edge2')
  })

  // examples/react/cypress/components/reactflow/storeAvailabilityOnRemount.cy.tsx:39
  test('[UP-128-048] node useEffect sees populated store after <ReactFlow> key remount', async ({
    page,
  }) => {
    await componentMount(page, adapter, 48)
    await expect
      .poll(() => history(page, 'checks'))
      .toContainEqual({ nodesLength: 2, lookupSize: 2 })
    await page.evaluate(() => {
      window.__component.checks.length = 0
    })
    await page.getByTestId('remount').click()
    await expect(page.locator('#app')).toHaveAttribute(
      'data-upstream-ready',
      'true'
    )
    await expect.poll(() => history(page, 'checks')).not.toHaveLength(0)
    const checks = await history(page, 'checks')
    expect(checks.every((c) => c.lookupSize === 2)).toBe(true)
  })

  // examples/react/cypress/components/reactflow/storeAvailabilityOnRemount.cy.tsx:58
  test('[UP-128-049] node useLayoutEffect sees populated store after <ReactFlow> key remount', async ({
    page,
  }) => {
    await componentMount(page, adapter, 49)
    await expect
      .poll(() => history(page, 'checks'))
      .toContainEqual({ nodesLength: 2, lookupSize: 2 })
    await page.evaluate(() => {
      window.__component.checks.length = 0
    })
    await page.getByTestId('remount').click()
    await expect(page.locator('#app')).toHaveAttribute(
      'data-upstream-ready',
      'true'
    )
    await expect.poll(() => history(page, 'checks')).not.toHaveLength(0)
    const checks = await history(page, 'checks')
    expect(checks.every((c) => c.lookupSize === 2)).toBe(true)
  })

  // examples/react/cypress/components/reactflow/storeAvailabilityOnRemount.cy.tsx:77
  test('[UP-128-050] node useEffect sees populated store after <ReactFlow> key remount with defaultNodes', async ({
    page,
  }) => {
    await componentMount(page, adapter, 50)
    await expect
      .poll(() => history(page, 'checks'))
      .toContainEqual({ nodesLength: 2, lookupSize: 2 })
    await page.evaluate(() => {
      window.__component.checks.length = 0
    })
    await page.getByTestId('remount').click()
    await expect(page.locator('#app')).toHaveAttribute(
      'data-upstream-ready',
      'true'
    )
    await expect.poll(() => history(page, 'checks')).not.toHaveLength(0)
    const checks = await history(page, 'checks')
    expect(checks.every((c) => c.lookupSize === 2)).toBe(true)
  })

  // examples/react/cypress/components/reactflow/uncontrolled.cy.tsx:10
  test('[UP-128-051] mounts nodes and edges', async ({ page }) => {
    await componentMount(page, adapter, 51)
    await expect(get(page, '.react-flow__node')).toHaveCount(2)
    await expect(get(page, '.react-flow__edge')).toHaveCount(1)
  })

  // examples/react/cypress/components/reactflow/uncontrolled.cy.tsx:15
  test('[UP-128-052] selects a node', async ({ page }) => {
    await componentMount(page, adapter, 52)
    const node = get(page, '.react-flow__node').first()
    await node.click()
    await expect(node).toHaveClass(/selected/u)
    await get(page, '.react-flow__pane').click()
    await expect(node).not.toHaveClass(/selected/u)
  })

  // examples/react/cypress/components/reactflow/uncontrolled.cy.tsx:21
  test('[UP-128-053] drags a node', async ({ page }) => {
    await componentMount(page, adapter, 53)
    const node = get(page, '.react-flow__node').first()
    const before = await transform(node)
    const subject = await drag(page, node, { x: 200, y: 25 })
    expect(await transformRetained(subject)).not.toEqual(before)
  })

  // examples/react/cypress/components/reactflow/uncontrolled.cy.tsx:30
  test('[UP-128-054] selects an edge', async ({ page }) => {
    await componentMount(page, adapter, 54)
    const edge = get(page, '.react-flow__edge').first()
    await adapter.edgeClick(edge)
    await expect(edge).toHaveClass(/selected/u)
    await get(page, '.react-flow__pane').click()
    await expect(edge).not.toHaveClass(/selected/u)
  })
}
