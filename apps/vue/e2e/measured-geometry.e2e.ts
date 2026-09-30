import { expect, test } from '@playwright/test'
import { Schema as S } from 'effect'

import { assertDynamicHandleRefresh } from '../../shared-e2e/handle-refresh-contract.ts'
import { assertSharedMeasurementContract } from '../../shared-e2e/measured-geometry-contract.ts'
import { createVueConformanceAdapter } from './conformance.ts'

test('Vue production APIs satisfy the shared measured-geometry cases', async ({
  page,
}) => {
  await assertSharedMeasurementContract(createVueConformanceAdapter(page))
})

const MeasurementResultSchema = S.Struct({
  results: S.Array(S.Struct({ nodeId: S.String, status: S.String })),
  width: S.Number,
  height: S.Number,
  status: S.String,
})

test('Vue demo toggles measured size and refreshes internal geometry', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Toggle measured size' }).click()
  await page.getByRole('button', { name: 'Refresh node internals' }).click()

  const resultHandle = await page.waitForFunction(() => {
    const output = document.querySelector<HTMLOutputElement>(
      '[data-testid="measurement-result"]'
    )

    if (output?.textContent === '') {
      return null
    }

    const node = document.querySelector<HTMLElement>(
      '[data-node-id="validate"]'
    )

    const viewport = document.querySelector<HTMLElement>('.flow-vue-viewport')

    if (node === null || viewport === null || output === null) {
      return null
    }

    const transform = new DOMMatrixReadOnly(
      getComputedStyle(viewport).transform
    )

    return {
      measurement: output.textContent ?? '',
      width: node.getBoundingClientRect().width / transform.a,
      height: node.getBoundingClientRect().height / transform.a,
    }
  })

  const result = await resultHandle.jsonValue()

  if (result === null) {
    throw new Error('Missing measured geometry result')
  }

  const geometry = S.decodeUnknownSync(MeasurementResultSchema)(
    JSON.parse(result.measurement)
  )

  expect(geometry.results).toEqual([
    { nodeId: 'validate', status: 'requested' },
  ])
  expect(geometry.status).toBe('measured')
  expect(geometry.width).toBeCloseTo(result.width)
  expect(geometry.height).toBeCloseTo(result.height)
  expect(geometry.width).toBe(260)
})

test('Vue settles a queued measurement refresh as disposed on unmount', async ({
  page,
}) => {
  await page.goto('/test.html')
  await page.evaluate(async () => {
    const harnessPath = '/src/test-harness.ts'
    await import(harnessPath)
    await window.__flowVueTest?.mountMeasurementDocument(
      {
        edges: [],
        nodes: [{ id: 'queued', label: 'Queued', position: { x: 0, y: 0 } }],
      },
      false
    )
  })

  const result = await page.evaluate(() => {
    const harness = window.__flowVueTest

    if (harness === undefined) {
      throw new Error('Missing Vue measurement harness')
    }

    return harness.refreshAndUnmountMeasurementDocument('queued')
  })

  expect(result).toEqual({ nodeId: 'queued', status: 'disposed' })
})

for (const zoom of [0.5, 2]) {
  for (const controlled of [false, true]) {
    test(`vue dynamic handle refresh at zoom ${zoom}, controlled ${
      controlled
    }`, async ({ page }) => {
      await assertDynamicHandleRefresh(page, 'vue', zoom, controlled, false)
    })
  }
}

test('vue actual public geometry and SVG endpoints match pinned equivalent handle layout', async ({
  page,
}) => {
  await assertDynamicHandleRefresh(page, 'vue', 1, false, true)
})
