import assert from 'node:assert/strict'
import path from 'node:path'

import { chromium } from '@playwright/test'
import { Schema as S } from 'effect'

declare global {
  interface Window {
    __interactionCapture?: string
    __interactionEvents?: { event: string; detail?: string }[]
  }
}

// Sequential mouse gestures share one mounted graph; parallel awaits would alter the public interaction sequence.
/* eslint-disable no-await-in-loop */
const expectedSha = '0a1f9575b25679f2880175de8d3eae21aedde921'

const root = path.resolve(import.meta.dir, '../..')

const fixturePath = path.resolve(
  root,
  'research/fixtures/interaction-lifecycle-reference.json'
)

const harnessRoot = path.resolve(
  root,
  'research/harnesses/interaction-lifecycle'
)

const port = 4191

const schema = S.Struct({
  connection: S.Array(
    S.Struct({ event: S.String, detail: S.optional(S.Unknown) })
  ),
  resize: S.Array(
    S.Struct({
      direction: S.String,
      events: S.Array(
        S.Struct({ event: S.String, detail: S.optional(S.Unknown) })
      ),
      nodes: S.Array(S.Unknown),
    })
  ),
  looseConnections: S.Array(S.Unknown),
  radius: S.Array(S.Unknown),
  cancellation: S.Array(
    S.Struct({
      method: S.String,
      signalEvents: S.Array(
        S.Struct({ event: S.String, detail: S.optional(S.Unknown) })
      ),
      stateAfterSignal: S.Unknown,
      terminalEvents: S.Array(
        S.Struct({ event: S.String, detail: S.optional(S.Unknown) })
      ),
      stateAfterTerminal: S.Unknown,
      retryEvents: S.Array(
        S.Struct({ event: S.String, detail: S.optional(S.Unknown) })
      ),
      retryState: S.Unknown,
    })
  ),
})

const arg = process.argv.find((value) => value.startsWith('--checkout='))

const checkoutArg =
  arg?.slice('--checkout='.length) ??
  process.argv[process.argv.indexOf('--checkout') + 1]

if (checkoutArg === undefined || !path.isAbsolute(checkoutArg)) {
  throw new Error(
    'Usage: bun run scripts/capture/capture-interaction-lifecycle-reference.ts --checkout /absolute/path/to/disposable-xyflow-checkout'
  )
}

const checkout = path.resolve(checkoutArg)

const run = (command: string[], cwd: string): void => {
  const result = Bun.spawnSync(command, {
    cwd,
    stdout: 'inherit',
    stderr: 'inherit',
  })

  if (result.exitCode !== 0) {
    throw new Error(`Command failed (${result.exitCode}): ${command.join(' ')}`)
  }
}

const output = (command: string[], cwd: string): string => {
  const result = Bun.spawnSync(command, { cwd, stdout: 'pipe', stderr: 'pipe' })

  if (result.exitCode !== 0) {
    throw new Error(`Command failed (${result.exitCode}): ${command.join(' ')}`)
  }

  return new TextDecoder().decode(result.stdout).trim()
}

assert.equal(output(['git', 'rev-parse', 'HEAD'], checkout), expectedSha)

assert.equal(
  output(['git', 'status', '--porcelain', '--untracked-files=all'], checkout),
  ''
)

run(
  [
    'corepack',
    'pnpm@10.33.4',
    '--dir',
    checkout,
    'install',
    '--frozen-lockfile',
  ],
  root
)

run(
  [
    'corepack',
    'pnpm@10.33.4',
    '--dir',
    checkout,
    '--filter',
    '@xyflow/system',
    'build',
  ],
  root
)

run(
  [
    'corepack',
    'pnpm@10.33.4',
    '--dir',
    checkout,
    '--filter',
    '@xyflow/react',
    'build',
  ],
  root
)

const server = Bun.spawn(
  [
    path.resolve(root, 'node_modules/.bin/vite'),
    '--config',
    path.resolve(harnessRoot, 'vite.config.ts'),
    '--host',
    '127.0.0.1',
    '--port',
    String(port),
    '--strictPort',
    harnessRoot,
  ],
  {
    cwd: root,
    env: { ...process.env, XYFLOW_CHECKOUT: checkout },
    stdout: 'inherit',
    stderr: 'inherit',
  }
)

const browser = await chromium.launch({ headless: true })

try {
  const captureOnce = async () => {
    const page = await browser.newPage({
      viewport: { width: 1000, height: 700 },
    })

    const load = async (query = '') => {
      await page.goto(`http://127.0.0.1:${port}${query}`, {
        waitUntil: 'domcontentloaded',
      })
      await page.waitForFunction(
        () => window.__interactionCapture !== undefined
      )
      await page.waitForTimeout(100)
    }

    const events = () => page.evaluate(() => window.__interactionEvents ?? [])

    const readCapture = async () => {
      const raw = await page.evaluate(() => window.__interactionCapture)

      if (!raw) {
        throw new Error('Probe did not publish mounted ReactFlow state')
      }

      return S.decodeUnknownSync(
        S.Struct({
          nodes: S.Array(S.Record(S.String, S.Unknown)),
          edges: S.Array(S.Unknown),
          connection: S.Struct({
            inProgress: S.Boolean,
            isValid: S.NullOr(S.Boolean),
            toNode: S.NullOr(S.String),
          }),
        })
      )(JSON.parse(raw))
    }

    const snapshot = async () => {
      const current = await readCapture()

      return current.nodes.map(
        ({ measured: _measured, internals: _internals, ...node }) => node
      )
    }

    const dragBetween = async (
      from: { x: number; y: number },
      to: { x: number; y: number }
    ) => {
      await page.mouse.move(from.x, from.y)
      await page.mouse.down()
      await page.mouse.move(to.x, to.y, { steps: 4 })
      await page.mouse.up()
      await page.waitForTimeout(80)
    }

    try {
      await load()

      // A valid connection traverses actual rendered public handles; invalid and cancelled paths are captured separately below.
      const source = await page
        .locator('.react-flow__node[data-id="target"] .source')
        .boundingBox()

      const target = await page
        .locator('.react-flow__node[data-id="parent"] .target')
        .boundingBox()

      if (!source || !target) {
        throw new Error('Mounted public source/target handles were not found')
      }

      await dragBetween(
        { x: source.x + source.width / 2, y: source.y + source.height / 2 },
        { x: target.x + target.width / 2, y: target.y + target.height / 2 }
      )
      const validEvents = await events()
      const invalidStart = validEvents.length
      await dragBetween(
        { x: source.x + source.width / 2, y: source.y + source.height / 2 },
        { x: 760, y: 520 }
      )
      const completedConnectionEvents = await events()

      const invalidConnectionEvents =
        completedConnectionEvents.slice(invalidStart)

      const connection = [...validEvents, ...invalidConnectionEvents]

      const resize: {
        direction: string
        events: Awaited<ReturnType<typeof events>>
        nodes: unknown[]
      }[] = []

      for (const direction of [
        'left',
        'right',
        'top',
        'bottom',
        'top-left',
        'top-right',
        'bottom-left',
        'bottom-right',
      ]) {
        const locator = page
          .locator(
            `.react-flow__node[data-id="parent"] .react-flow__resize-control.${direction.split('-').join('.')}`
          )
          .first()

        const box = await locator.boundingBox()

        if (!box) {
          throw new Error(
            `Public NodeResizer ${direction} control not rendered`
          )
        }

        const previousEvents = await events()
        const before = previousEvents.length
        const start = { x: box.x + box.width / 2, y: box.y + box.height / 2 }

        const delta = {
          left: { x: -12, y: 0 },
          right: { x: 12, y: 0 },
          top: { x: 0, y: -12 },
          bottom: { x: 0, y: 12 },
          'top-left': { x: -12, y: -12 },
          'top-right': { x: 12, y: -12 },
          'bottom-left': { x: -12, y: 12 },
          'bottom-right': { x: 12, y: 12 },
        }[direction]

        if (delta === undefined) {
          throw new Error(`Missing resize delta for ${direction}`)
        }

        const end = { x: start.x + delta.x, y: start.y + delta.y }

        await dragBetween(start, end)
        const currentEvents = await events()

        resize.push({
          direction,
          events: currentEvents.slice(before),
          nodes: await snapshot(),
        })
      }

      const cancellation = []

      for (const method of ['Escape', 'pointercancel']) {
        await load()

        const src = await page
          .locator('.react-flow__node[data-id="target"] .source')
          .boundingBox()

        if (!src) {
          throw new Error(
            'Public source handle missing for cancellation observation'
          )
        }

        const start = { x: src.x + src.width / 2, y: src.y + src.height / 2 }
        const initialEvents = await events()
        const eventStart = initialEvents.length
        await page.mouse.move(start.x, start.y)
        await page.mouse.down()
        await page.mouse.move(start.x + 30, start.y + 30, { steps: 3 })
        await page.waitForTimeout(50)

        const signalCancel = {
          Escape: () => page.keyboard.press('Escape'),
          pointercancel: () =>
            page.evaluate(() => {
              document.dispatchEvent(
                new PointerEvent('pointercancel', {
                  bubbles: true,
                  pointerId: 1,
                  pointerType: 'mouse',
                })
              )
            }),
        }[method]

        if (!signalCancel) {
          throw new Error(`Missing cancellation input: ${method}`)
        }

        await signalCancel()

        await page.waitForTimeout(50)
        const afterSignalEvents = await events()
        const signalEvents = afterSignalEvents.slice(eventStart)
        const stateAfterSignal = await readCapture()

        await page.mouse.up()
        await page.waitForTimeout(80)
        const afterTerminalEvents = await events()
        const terminalEvents = afterTerminalEvents.slice(eventStart)
        const stateAfterTerminal = await readCapture()
        const retryStart = terminalEvents.length + eventStart

        const retrySource = await page
          .locator('.react-flow__node[data-id="target"] .source')
          .boundingBox()

        const retryTargetLocator = page.locator(
          '.react-flow__node[data-id="parent"] .target'
        )

        const retryTarget = await retryTargetLocator.boundingBox()

        if (!retrySource || !retryTarget) {
          throw new Error('Public handles missing for post-cancellation retry')
        }

        await dragBetween(
          {
            x: retrySource.x + retrySource.width / 2,
            y: retrySource.y + retrySource.height / 2,
          },
          {
            x: retryTarget.x + retryTarget.width / 2,
            y: retryTarget.y + retryTarget.height / 2,
          }
        )

        const allEvents = await events()
        const retryCapture = await readCapture()

        cancellation.push({
          method,
          signalEvents,
          stateAfterSignal: {
            connection: stateAfterSignal.connection,
            nodeIds: stateAfterSignal.nodes.map(({ id }) => id),
            edgeIds: stateAfterSignal.edges.map(
              (edge) => S.decodeUnknownSync(S.Struct({ id: S.String }))(edge).id
            ),
          },
          terminalEvents,
          stateAfterTerminal: {
            connection: stateAfterTerminal.connection,
            nodeIds: stateAfterTerminal.nodes.map(({ id }) => id),
            edgeIds: stateAfterTerminal.edges.map(
              (edge) => S.decodeUnknownSync(S.Struct({ id: S.String }))(edge).id
            ),
          },
          retryEvents: allEvents.slice(retryStart),
          retryState: {
            connection: retryCapture.connection,
            nodes: await snapshot(),
            edges: retryCapture.edges,
          },
        })
      }

      const looseConnections = []

      for (const variant of [
        { name: 'source-to-source', from: 'source', to: 'source' },
        { name: 'target-to-target', from: 'target', to: 'target' },
        { name: 'target-origin-to-source', from: 'target', to: 'source' },
      ]) {
        await load('?mode=loose')

        const fromLocator = page.locator(
          `.react-flow__node[data-id="target"] .${variant.from}`
        )

        const toLocator = page.locator(
          `.react-flow__node[data-id="parent"] .${variant.to}`
        )

        const from = await fromLocator.boundingBox()
        const to = await toLocator.boundingBox()

        if (!from || !to) {
          throw new Error(`Loose ${variant.name} handles not rendered`)
        }

        await dragBetween(
          { x: from.x + from.width / 2, y: from.y + from.height / 2 },
          { x: to.x + to.width / 2, y: to.y + to.height / 2 }
        )
        const looseCapture = await readCapture()
        looseConnections.push({
          variant: variant.name,
          events: await events(),
          edges: looseCapture.edges,
        })
      }

      const radius = []

      for (const observation of [
        { name: 'direct-hit-zoom-1', zoom: 1, offset: 0 },
        { name: 'nearest-within-radius-zoom-1', zoom: 1, offset: 15 },
        { name: 'outside-radius-zoom-1', zoom: 1, offset: 45 },
        { name: 'nearest-within-radius-zoom-2', zoom: 2, offset: 30 },
        { name: 'outside-radius-zoom-2', zoom: 2, offset: 90 },
      ]) {
        await load(`?zoom=${observation.zoom}&radius=20`)

        const from = await page
          .locator('.react-flow__node[data-id="target"] .source')
          .boundingBox()

        const to = await page
          .locator('.react-flow__node[data-id="parent"] .target')
          .boundingBox()

        if (!from || !to) {
          throw new Error(`Radius handles missing for ${observation.name}`)
        }

        await dragBetween(
          { x: from.x + from.width / 2, y: from.y + from.height / 2 },
          {
            x: to.x + to.width / 2 + observation.offset,
            y: to.y + to.height / 2,
          }
        )
        const radiusCapture = await readCapture()
        radius.push({
          ...observation,
          events: await events(),
          connection: radiusCapture.connection,
          edges: radiusCapture.edges,
        })
      }

      return S.decodeUnknownSync(schema)({
        connection,
        resize,
        cancellation,
        looseConnections,
        radius,
      })
    } finally {
      await page.close()
    }
  }

  const first = await captureOnce()
  const second = await captureOnce()
  assert.deepEqual(
    first,
    second,
    'normalized pinned interaction captures must be stable'
  )

  const manifest = S.decodeUnknownSync(S.Struct({ version: S.String }))(
    JSON.parse(
      await Bun.file(
        path.resolve(checkout, 'packages/react/package.json')
      ).text()
    )
  )

  const fixture = {
    metadata: {
      framework: 'React',
      package: '@xyflow/react',
      version: manifest.version,
      upstreamSha: expectedSha,
      viewport: { width: 1000, height: 700 },
      normalization:
        'timestamps and renderer-measured geometry removed; callback event order and public node/edge values retained',
      notes:
        'Pinned capture is xyflow v12.11.6 at the stated commit. Current website docs are a separate moving contract; the repository correspondence table marks connectionRadius adapter equivalence and onConnectEnd host callbacks partial or unverified, so this capture does not claim current-site parity.',
      capturedAt: new Date().toISOString(),
    },
    cases: first,
  }

  await Bun.write(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`)
  run(['bunx', 'oxfmt', fixturePath], root)
  process.stdout.write(await Bun.file(fixturePath).text())
} finally {
  await browser.close()
  server.kill()
  await server.exited
}
