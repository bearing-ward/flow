import { FlowDocumentSchema, FlowHistoryStatusSchema } from '@flow/core'
import { expect, test } from '@playwright/test'
import type { Locator } from '@playwright/test'
import { Schema } from 'effect'

const initial: typeof FlowDocumentSchema.Encoded = {
  nodes: [
    {
      id: 'a',
      label: 'Alpha',
      position: { x: 70, y: 65 },
      size: { width: 120, height: 48 },
      handles: [{ id: 'out', kind: 'source', side: 'right' }],
    },
    {
      id: 'b',
      label: 'Beta',
      position: { x: 370, y: 65 },
      size: { width: 120, height: 48 },
      handles: [{ id: 'in', kind: 'target', side: 'left' }],
    },
    {
      id: 'c',
      label: 'Gamma',
      position: { x: 370, y: 220 },
      size: { width: 120, height: 48 },
      handles: [{ id: 'in', kind: 'target', side: 'left' }],
    },
  ],
  edges: [
    {
      id: 'move',
      source: 'a',
      sourceHandle: 'out',
      target: 'b',
      targetHandle: 'in',
      reconnectable: true,
    },
  ],
}

const moved = {
  ...initial,
  nodes: initial.nodes.map((node) =>
    node.id === 'a' ? { ...node, position: { x: 150, y: 100 } } : node
  ),
}

const readDocument = async (canvas: Locator) =>
  Schema.decodeUnknownSync(FlowDocumentSchema)(
    JSON.parse((await canvas.getByTestId('saved-document').textContent()) ?? '')
  )

const readStatus = async (canvas: Locator) =>
  Schema.decodeUnknownSync(FlowHistoryStatusSchema)(
    JSON.parse((await canvas.getByTestId('history-status').textContent()) ?? '')
  )

const statusField = async (
  canvas: Locator,
  field: keyof typeof FlowHistoryStatusSchema.Type
) => {
  const status = await readStatus(canvas)

  return status[field]
}

const node = (canvas: Locator, id = 'a') =>
  canvas.locator(`[data-testid="flow-node"][data-node-id="${id}"]`)

const click = (canvas: Locator, label: string) =>
  canvas.getByRole('button', { name: label, exact: true }).click()

const expectDocument = async (
  canvas: Locator,
  expected: typeof FlowDocumentSchema.Encoded
) => {
  await click(canvas, 'Save')
  await expect.poll(() => readDocument(canvas)).toEqual(expected)
}

const expectPosition = async (canvas: Locator, x: number, y: number) => {
  await expect(node(canvas)).toHaveCSS('left', `${x}px`)
  await expect(node(canvas)).toHaveCSS('top', `${y}px`)
}

test('Foldkit records public add/delete/move edits, restores saved documents and rendered membership, and clears redo branches', async ({
  page,
}) => {
  await page.goto('/history/')
  const canvas = page.getByTestId('history-main')
  await expect(
    canvas.getByRole('button', { name: 'Undo', exact: true })
  ).toBeDisabled()
  await expect(
    canvas.getByRole('button', { name: 'Redo', exact: true })
  ).toBeDisabled()
  await expectDocument(canvas, initial)
  await click(canvas, 'Reject edit')
  await expect(canvas.getByTestId('proposal-status')).toHaveText(/rejected/u)
  await expect.poll(() => statusField(canvas, 'pastCount')).toBe(0)
  await click(canvas, 'Move node')
  await expectDocument(canvas, moved)
  await expectPosition(canvas, 150, 100)
  await click(canvas, 'Move node')
  await expect.poll(() => statusField(canvas, 'pastCount')).toBe(1)
  await click(canvas, 'Undo')
  await expectDocument(canvas, initial)
  await expectPosition(canvas, 70, 65)
  await click(canvas, 'Redo')
  await expectDocument(canvas, moved)
  await click(canvas, 'Undo')
  await click(canvas, 'Add node')

  const added = {
    id: 'added',
    label: 'Added',
    position: { x: 640, y: 65 },
    size: { width: 120, height: 48 },
  }

  await expectDocument(canvas, { ...initial, nodes: [...initial.nodes, added] })
  await expect(node(canvas, 'added')).toBeVisible()
  await expect(
    canvas.getByRole('button', { name: 'Redo', exact: true })
  ).toBeDisabled()
  await click(canvas, 'Undo')
  await expectDocument(canvas, initial)
  await expect(node(canvas, 'added')).toHaveCount(0)
  await click(canvas, 'Redo')
  await expect(node(canvas, 'added')).toBeVisible()
  await click(canvas, 'Undo')
  await click(canvas, 'Add edge')

  const addedEdge = {
    id: 'added-edge',
    source: 'a',
    sourceHandle: 'out',
    target: 'c',
    targetHandle: 'in',
  }

  await expectDocument(canvas, {
    ...initial,
    edges: [...initial.edges, addedEdge],
  })
  await expect(
    canvas.locator('[data-testid="flow-edge"][data-edge-id="added-edge"]')
  ).toHaveCount(1)
  await click(canvas, 'Undo')
  await expectDocument(canvas, initial)
  await expect(
    canvas.locator('[data-testid="flow-edge"][data-edge-id="added-edge"]')
  ).toHaveCount(0)
  await click(canvas, 'Redo')
  await expectDocument(canvas, {
    ...initial,
    edges: [...initial.edges, addedEdge],
  })
  await click(canvas, 'Undo')

  const checkDeletion = async (kind: 'node' | 'edge'): Promise<void> => {
    await click(canvas, `Delete ${kind}`)

    const removed =
      kind === 'node'
        ? { nodes: initial.nodes.filter(({ id }) => id !== 'b'), edges: [] }
        : { ...initial, edges: [] }

    await expectDocument(canvas, removed)
    await expect(
      canvas.locator('[data-testid="flow-edge"][data-edge-id="move"]')
    ).toHaveCount(0)
    await click(canvas, 'Undo')
    await expectDocument(canvas, initial)
    await expect(node(canvas, 'b')).toBeVisible()
    await expect(
      canvas.locator('[data-testid="flow-edge"][data-edge-id="move"]')
    ).toHaveCount(1)
    await click(canvas, 'Redo')
    await expectDocument(canvas, removed)
    await click(canvas, 'Undo')
  }

  await checkDeletion('node')
  await checkDeletion('edge')
  await expectDocument(canvas, initial)
})

test('Foldkit coalesces a whole drag, cancels previews, and restores edge move/reconnect endpoints', async ({
  page,
}) => {
  await page.goto('/history/')
  const canvas = page.getByTestId('history-main')
  await expect(node(canvas)).toBeVisible()
  const bounds = await node(canvas).boundingBox()

  if (bounds === null) {
    throw new Error('Missing Alpha bounds')
  }

  const start = { x: bounds.x + 45, y: bounds.y + 24 }
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(start.x + 30, start.y + 15, { steps: 5 })
  await page.mouse.move(start.x + 80, start.y + 35, { steps: 5 })
  await page.mouse.up()
  await expectPosition(canvas, 150, 100)
  await expectDocument(canvas, moved)
  await expect.poll(() => statusField(canvas, 'pastCount')).toBe(1)
  await click(canvas, 'Undo')
  await expectPosition(canvas, 70, 65)
  await expectDocument(canvas, initial)
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(start.x + 90, start.y + 30, { steps: 5 })
  await page.keyboard.press('Escape')
  await page.mouse.up()
  await expectPosition(canvas, 70, 65)
  await expectDocument(canvas, initial)
  await expect.poll(() => statusField(canvas, 'pastCount')).toBe(0)
  await expect.poll(() => statusField(canvas, 'futureCount')).toBe(1)
  const edge = canvas.locator('[data-testid="flow-edge"][data-edge-id="move"]')
  const path = edge.locator('.flow-foldkit-edge-path')
  const originalPath = await path.getAttribute('d')
  await click(canvas, 'Move edge')

  const reconnected = {
    ...initial,
    edges: initial.edges.map((item) => ({ ...item, target: 'c' })),
  }

  await expectDocument(canvas, reconnected)
  await expect(path).not.toHaveAttribute('d', originalPath ?? '')
  await click(canvas, 'Undo')
  await expectDocument(canvas, initial)
  await expect(path).toHaveAttribute('d', originalPath ?? '')
  await click(canvas, 'Redo')
  await expectDocument(canvas, reconnected)
  await click(canvas, 'Undo')
  // Public edge selection and native reconnect gesture, never a history mutation.
  const hit = edge.locator('.flow-foldkit-edge-hit-target')

  const center = await hit.evaluate((element) => {
    if (!(element instanceof SVGPathElement)) {
      throw new TypeError('Missing edge path')
    }

    const matrix = element.getScreenCTM()

    if (matrix === null) {
      throw new Error('Missing edge transform')
    }

    const point = element.getPointAtLength(element.getTotalLength() / 2)
    const screen = new DOMPoint(point.x, point.y).matrixTransform(matrix)

    return { x: screen.x, y: screen.y }
  })

  await page.mouse.click(center.x, center.y)

  const reconnect = canvas.locator(
    '[data-edge-id="move"][data-edge-endpoint="target"]'
  )

  const target = node(canvas, 'c').locator('[data-handle-id="in"]')
  const reconnectBounds = await reconnect.boundingBox()
  const targetBounds = await target.boundingBox()

  if (reconnectBounds === null || targetBounds === null) {
    throw new Error('Missing reconnect controls')
  }

  await page.mouse.move(
    reconnectBounds.x + reconnectBounds.width / 2,
    reconnectBounds.y + reconnectBounds.height / 2
  )
  await page.mouse.down()
  await page.mouse.move(
    targetBounds.x + targetBounds.width / 2,
    targetBounds.y + targetBounds.height / 2,
    { steps: 8 }
  )
  await page.mouse.up()
  await expectDocument(canvas, reconnected)
  await click(canvas, 'Undo')
  await expectDocument(canvas, initial)
  await expect(path).toHaveAttribute('d', originalPath ?? '')
  await click(canvas, 'Redo')
  await expectDocument(canvas, reconnected)
})

for (const modifier of ['Control', 'Meta']) {
  test(`Foldkit ${modifier} shortcuts group repeated keys, preserve native input and composition, and isolate canvases`, async ({
    page,
  }) => {
    await page.goto('/history/')
    const canvas = page.getByTestId('history-main')
    const isolated = page.getByTestId('history-isolated')
    await click(canvas, 'Move node')
    await node(canvas).click({ position: { x: 45, y: 24 } })
    await node(canvas).focus()
    await page.keyboard.down('ArrowRight')
    await page.keyboard.down('ArrowRight')
    await page.keyboard.down('ArrowRight')
    await page.keyboard.up('ArrowRight')

    const repeatMoved = {
      ...moved,
      nodes: moved.nodes.map((item) =>
        item.id === 'a' ? { ...item, position: { x: 165, y: 100 } } : item
      ),
    }

    await expectDocument(canvas, repeatMoved)
    await expect.poll(() => statusField(canvas, 'pastCount')).toBe(2)
    await node(canvas).focus()
    await page.keyboard.press(`${modifier}+z`)
    await expectDocument(canvas, moved)
    await node(canvas).focus()
    await page.keyboard.press(`${modifier}+Shift+z`)
    await expectDocument(canvas, repeatMoved)
    await expectDocument(isolated, initial)
    await expect.poll(() => statusField(isolated, 'pastCount')).toBe(0)
    const before = await readStatus(canvas)
    await node(canvas).dispatchEvent('keydown', {
      key: 'z',
      code: 'KeyZ',
      ctrlKey: true,
      isComposing: true,
      bubbles: true,
      cancelable: true,
    })
    await expectDocument(canvas, repeatMoved)
    expect(await readStatus(canvas)).toEqual(before)
    const input = canvas.getByRole('textbox', { name: 'Native text' })
    await input.fill('before')
    await input.press('End')
    await input.pressSequentially(' after')
    await input.press('ControlOrMeta+z')
    await expect(input).toHaveValue('before')
    await expectDocument(canvas, repeatMoved)
    await input.press('Control+z')
    await expectDocument(canvas, repeatMoved)
    expect(await readStatus(canvas)).toEqual(before)
  })
}

test('Foldkit controlled native keyboard repeats retain total movement in one undo step', async ({
  page,
}) => {
  await page.goto('/history/')
  const canvas = page.getByTestId('history-controlled')
  await node(canvas).click({ position: { x: 45, y: 24 } })
  await expect.poll(() => statusField(canvas, 'pastCount')).toBe(0)
  await node(canvas).focus()
  await page.keyboard.down('ArrowRight')
  await expectPosition(canvas, 75, 65)
  await page.keyboard.down('ArrowRight')
  await expectPosition(canvas, 80, 65)
  await page.keyboard.down('ArrowRight')
  await expectPosition(canvas, 85, 65)
  await page.keyboard.up('ArrowRight')

  const repeated = {
    ...initial,
    nodes: initial.nodes.map((item) =>
      item.id === 'a' ? { ...item, position: { x: 85, y: 65 } } : item
    ),
  }

  await expectDocument(canvas, repeated)
  await expect.poll(() => statusField(canvas, 'pastCount')).toBe(1)
  await click(canvas, 'Undo')
  await expectDocument(canvas, initial)
  await expectPosition(canvas, 70, 65)
  await expect.poll(() => statusField(canvas, 'pastCount')).toBe(0)
  await expect.poll(() => statusField(canvas, 'futureCount')).toBe(1)
  await click(canvas, 'Redo')
  await expectDocument(canvas, repeated)
  await expectPosition(canvas, 85, 65)
  await expect.poll(() => statusField(canvas, 'pastCount')).toBe(1)
  await node(canvas).focus()
  await page.keyboard.press('ArrowRight')
  await expectPosition(canvas, 90, 65)
  await expect.poll(() => statusField(canvas, 'pastCount')).toBe(2)
  await click(canvas, 'Undo')
  await expectDocument(canvas, repeated)
  await expectPosition(canvas, 85, 65)
  await click(canvas, 'Undo')
  await expectDocument(canvas, initial)
  await expectPosition(canvas, 70, 65)
})

test('Foldkit controlled owner accepts and rejects replay without moving history early', async ({
  page,
}) => {
  await page.goto('/history/')
  const canvas = page.getByTestId('history-controlled')
  await click(canvas, 'Reject edit')
  await expect(canvas.getByTestId('proposal-status')).toHaveText('rejected')
  await expectDocument(canvas, initial)
  await expect.poll(() => statusField(canvas, 'pastCount')).toBe(0)
  await click(canvas, 'Move node')
  await expectDocument(canvas, moved)
  await click(canvas, 'Hold replay')
  await click(canvas, 'Undo')
  await expect(canvas.getByTestId('proposal-status')).toHaveText('pending')
  await expect.poll(() => statusField(canvas, 'pending')).toBe(true)
  await expectDocument(canvas, moved)
  expect(await readStatus(canvas)).toMatchObject({
    pastCount: 1,
    futureCount: 0,
  })
  await click(canvas, 'Reject replay')
  await expect.poll(() => statusField(canvas, 'pending')).toBe(false)
  await expectDocument(canvas, moved)
  expect(await readStatus(canvas)).toMatchObject({
    pastCount: 1,
    futureCount: 0,
  })
  await click(canvas, 'Hold replay')
  await click(canvas, 'Undo')
  await expect.poll(() => statusField(canvas, 'pending')).toBe(true)
  await click(canvas, 'Accept replay')
  await expectDocument(canvas, initial)
  await expectPosition(canvas, 70, 65)
  await expect.poll(() => statusField(canvas, 'pending')).toBe(false)
  expect(await readStatus(canvas)).toMatchObject({
    pastCount: 0,
    futureCount: 1,
  })
  await click(canvas, 'Redo')
  await expectDocument(canvas, moved)
  await expectPosition(canvas, 150, 100)
  expect(await readStatus(canvas)).toMatchObject({
    pastCount: 1,
    futureCount: 0,
    pending: false,
  })
})

test('Foldkit capacity zero disables recording; bounded sessions dispose and reset on reload', async ({
  page,
}) => {
  await page.goto('/history/?capacity=0')
  const canvas = page.getByTestId('history-main')
  await click(canvas, 'Move node')
  await expectDocument(canvas, moved)
  await expect.poll(() => statusField(canvas, 'capacity')).toBe(0)
  await expect(
    canvas.getByRole('button', { name: 'Undo', exact: true })
  ).toBeDisabled()
  await page.goto('/history/?capacity=1')
  await click(canvas, 'Move node')
  await click(canvas, 'Add node')
  await expect.poll(() => statusField(canvas, 'pastCount')).toBe(1)
  await click(canvas, 'Undo')
  await expectDocument(canvas, moved)
  await expect(
    canvas.getByRole('button', { name: 'Undo', exact: true })
  ).toBeDisabled()
  await click(canvas, 'Dispose')
  await expect(canvas).toHaveAttribute('data-disposed', 'true')
  await expect(node(canvas)).toHaveCount(0)
  await page.keyboard.press('Control+z')
  await page.keyboard.press('Meta+z')
  expect(await readDocument(canvas)).toEqual(moved)
  expect(await readStatus(canvas)).toMatchObject({
    disposed: true,
    pastCount: 0,
    futureCount: 0,
  })
  await expect(
    canvas.getByRole('button', { name: 'Redo', exact: true })
  ).toBeDisabled()
  const isolated = page.getByTestId('history-isolated')
  await click(isolated, 'Move node')
  await expectDocument(isolated, moved)
  await click(isolated, 'Undo')
  await expectDocument(isolated, initial)
  await page.reload()
  await expectDocument(canvas, initial)
  await expectPosition(canvas, 70, 65)
  await click(canvas, 'Move node')
  await expect.poll(() => statusField(canvas, 'pastCount')).toBe(1)
  await page.reload()
  await expectDocument(canvas, initial)
  await expectPosition(canvas, 70, 65)
  expect(await readStatus(canvas)).toMatchObject({
    pastCount: 0,
    futureCount: 0,
    pending: false,
    disposed: false,
  })
})
