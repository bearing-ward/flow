import { readFileSync } from 'node:fs'

import { BunRuntime, BunServices } from '@effect/platform-bun'
import { chromium } from '@playwright/test'
import type { Page, Locator } from '@playwright/test'
import { Effect, FileSystem, Path, Schema } from 'effect'
import { ChildProcess, ChildProcessSpawner } from 'effect/process'
import { createServer } from 'vite'

import type { FoldkitSnapshotResult } from '../packages/foldkit/src/snapshot-client.ts'
import { FixtureSchema } from '../research/harnesses/path-helper/cases.ts'
import { checkPackageArchive } from './package-archive'

declare global {
  interface Window {
    __flowPathHelperTuples?: string
    __flowPackedFitSerialization?: {
      raw: string
      actual: string | undefined
      canonical: string
    }
    __flowPackedUI?: { dispose: () => void; exercise: () => Promise<string> }
    __flowConsumerController?: { destroy: () => void }
    __flowConsumerResult?: {
      readonly decodedNodeId: string
      readonly canvasCount: number
      readonly initialSnapshotNodeId: string | undefined
      readonly updatedNodeId: string | undefined
      readonly stateNotificationCount: number
      readonly editResult: string
      readonly utilityResult: string
    }
    __flowVueConsumer?: { readonly dispose: () => void }
    __flowFoldkitConsumer?: {
      readonly fit: () => Promise<string>
      readonly edit: () => Promise<string>
      readonly measure: () => Promise<string>
      readonly mountSecond: () => void
      readonly snapshot: (
        owner: 'first' | 'second'
      ) => Promise<FoldkitSnapshotResult>
      readonly dispose: () => void
    }
  }
}

const rootUrl = new URL('../', import.meta.url)

const packageNames = {
  'packages/core': '@flow/core',
  'packages/workflow': '@flow/workflow',
  'apps/vanilla': '@flow/vanilla',
  'packages/vue': '@flow/vue',
  'packages/foldkit': '@flow/foldkit',
} as const

type PackagePath = keyof typeof packageNames

const verifyPackedMarkup = async (
  page: Page,
  ui: Locator,
  host: 'vanilla' | 'vue' | 'foldkit'
) => {
  const content =
    host === 'foldkit'
      ? page.locator('.flow-foldkit-node[data-node-id="foldkit-a"]').first()
      : ui

  const text = await content.textContent()

  if (
    !text?.includes('users') ||
    !text.includes('uuid') ||
    !text.includes('Packed output')
  ) {
    throw new Error(`${host} DatabaseSchema or LabeledHandle output is missing`)
  }

  if (
    host === 'foldkit' &&
    ((await content.locator('[role="status"]').count()) !== 1 ||
      (await content.locator('[data-flow-base-handle]').count()) !== 1)
  ) {
    throw new Error('Foldkit StatusIndicator or BaseHandle markup is missing')
  }
}

const verifyPackedUI = async (
  page: Page,
  host: 'vanilla' | 'vue' | 'foldkit'
) => {
  const ui = page.locator('[data-packed-ui]')
  await ui.waitFor()
  const action = ui.locator('[data-packed-action]')

  if (
    (await action.getAttribute('name')) !== 'packed-action' ||
    (await action.getAttribute('value')) !== 'refresh' ||
    (await action.getAttribute('type')) !== 'button'
  ) {
    throw new Error(`${host} public ControlButton lost native props`)
  }

  await action.focus()
  const tooltip = ui.locator('[role="tooltip"]')
  await tooltip.waitFor({ state: 'visible' })

  if ((await tooltip.textContent()) !== 'Packed tooltip') {
    throw new Error(`${host} public Tooltip did not render its text`)
  }

  await action.click()

  const statusText =
    host === 'foldkit'
      ? null
      : await ui.locator('[role="status"]').textContent()

  if (host === 'foldkit') {
    if ((await ui.getAttribute('data-activated')) !== 'true') {
      throw new Error('Foldkit ControlButton callback failed')
    }
  } else if (!statusText?.includes('Ready')) {
    throw new Error(
      `${host} public StatusIndicator did not update after ControlButton action`
    )
  }

  const disclosure = ui.getByRole('button', { name: 'Details', exact: true })

  if ((await disclosure.getAttribute('aria-expanded')) !== 'false') {
    throw new Error(`${host} Appendix started expanded`)
  }

  await disclosure.click()

  if ((await disclosure.getAttribute('aria-expanded')) !== 'true') {
    throw new Error(`${host} Appendix did not expand`)
  }

  const detailsId = await disclosure.getAttribute('aria-controls')

  if (detailsId === null) {
    throw new Error(`${host} Appendix has no controlled region`)
  }

  await page.locator(`#${detailsId}`).waitFor({ state: 'visible' })
  await ui.locator('[data-packed-placeholder]').click()

  if ((await ui.getAttribute('data-added')) !== 'true') {
    throw new Error(`${host} Placeholder callback failed`)
  }

  await verifyPackedMarkup(page, ui, host)
}

const verifyPurePathHelpers = async (page: Page): Promise<void> => {
  await page.waitForFunction(() => window.__flowPathHelperTuples !== undefined)

  const fixture = Schema.decodeUnknownSync(FixtureSchema)(
    JSON.parse(
      readFileSync(
        new URL(
          '../research/fixtures/path-helper-reference.json',
          import.meta.url
        ),
        'utf-8'
      )
    )
  )

  const expected = fixture.cases
    .filter(({ descriptor }) => descriptor.domain === 'numeric')
    .map(({ descriptor, outcome }) => {
      if (outcome.kind !== 'return') {
        throw new Error(`Unexpected numeric reference throw ${descriptor.id}`)
      }

      return {
        id: descriptor.id,
        tuple: outcome.tuple.map((value) =>
          value.tag === 'finite' || value.tag === 'string'
            ? value.value
            : { tag: value.tag }
        ),
      }
    })

  const actual = await page.evaluate(() => window.__flowPathHelperTuples)

  if (actual !== JSON.stringify(expected)) {
    throw new Error(
      'Installed pure helper tuples differ from the genuine pinned full tuples'
    )
  }

  process.stdout.write(
    `Verified ${expected.length} installed pure helper full tuples\n`
  )
}

const verifyVanilla = async (page: Page) => {
  await verifyPurePathHelpers(page)

  await page.waitForFunction(() => window.__flowConsumerResult !== undefined)

  await page.waitForFunction(() => window.__flowPackedUI !== undefined)
  await verifyPackedUI(page, 'vanilla')
  const ownership = await page.evaluate(() => window.__flowPackedUI?.exercise())

  const fitSerialization = await page.evaluate(
    () => window.__flowPackedFitSerialization
  )

  if (
    fitSerialization !== undefined &&
    fitSerialization.raw !== fitSerialization.actual
  ) {
    console.log(
      `Vanilla fit CSS serialization: ${JSON.stringify(fitSerialization)}`
    )
  }

  if (
    ownership !==
      'Before acknowledgement:After acknowledgement:Before acknowledgement:true:true:accepted:true' &&
    ownership !==
      'Before acknowledgement:After acknowledgement:Before acknowledgement:true:true:unchanged:true'
  ) {
    throw new Error(
      `Vanilla custom renderer, controlled ownership, independent instance, measurement or fit failed: ${ownership}`
    )
  }

  if (
    (await page.locator('.flow-base-node').count()) !== 1 ||
    (await page.locator('[data-handle-id="packed-output"]').count()) !== 2
  ) {
    throw new Error(
      'Vanilla archive custom renderer or BaseHandle integration missing'
    )
  }

  const shell = page.locator('.flow-base-node')

  if (
    (await shell.getAttribute('aria-label')) !== 'After acknowledgement' ||
    (await shell.locator('h2').textContent()) !== 'After acknowledgement'
  ) {
    throw new Error(
      'Vanilla custom renderer did not update rendered owner-acknowledged output'
    )
  }

  await page.evaluate(() => window.__flowPackedUI?.dispose())

  if ((await page.locator('[data-packed-ui]').count()) !== 0) {
    throw new Error('Vanilla packed UI helpers leaked after disposal')
  }

  const result = await page.evaluate(() => {
    const value = window.__flowConsumerResult

    if (value === undefined) {
      throw new Error('Missing Vanilla consumer result')
    }

    const canvas = document.querySelector<HTMLElement>('.flow-canvas')

    if (canvas === null) {
      throw new Error('Missing Vanilla canvas')
    }

    const canvasPosition = getComputedStyle(canvas).position
    window.__flowConsumerController?.destroy()

    return {
      ...value,
      canvasCountAfterDestroy: document.querySelectorAll(
        "[data-testid='flow-canvas']"
      ).length,
      canvasPosition,
    }
  })

  if (
    result.decodedNodeId !== 'packed-node' ||
    result.canvasCount !== 1 ||
    result.initialSnapshotNodeId !== 'packed-node' ||
    result.updatedNodeId !== 'packed-updated' ||
    result.stateNotificationCount !== 1 ||
    result.editResult !== 'A updated:3:3:2:true:edit-b:edit-edge' ||
    result.utilityResult !== 'true:true:true:true:true:true:10,5,10,5' ||
    result.canvasCountAfterDestroy !== 0 ||
    result.canvasPosition !== 'relative'
  ) {
    throw new Error(
      `Unexpected Vanilla packed result: ${JSON.stringify(result)}`
    )
  }
}

const verifyVue = async (page: Page) => {
  await verifyPurePathHelpers(page)

  const first = page.locator('.flow-vue-node[data-node-id="vue-first"]')
  const second = page.locator('.flow-vue-node[data-node-id="vue-second"]')
  await first.waitFor()
  await second.waitFor()

  if ((await page.locator('.flow-vue-canvas').count()) !== 2) {
    throw new Error('Vue consumer did not mount two independent canvases')
  }

  if (
    (await first.locator('[data-status="vue-first"]').textContent()) !==
    'waiting'
  ) {
    throw new Error('Vue initial accepted status is missing')
  }

  if (
    (await page
      .locator('.flow-vue-canvas')
      .first()
      .evaluate((element) => getComputedStyle(element).position)) !== 'relative'
  ) {
    throw new Error('Vue package stylesheet was not applied')
  }

  await first.locator('[data-edit="vue-first"]').click()
  await page.getByText('1', { exact: true }).waitFor()

  if (
    (await first.locator('[data-status="vue-first"]').textContent()) !==
    'waiting'
  ) {
    throw new Error(
      'Controlled Vue proposal mutated accepted state before acknowledgement'
    )
  }

  await page.locator('[data-accept]').click()
  await page.waitForFunction(
    () =>
      document.querySelector('[data-status="vue-first"]')?.textContent ===
      'ready'
  )

  if (
    (await second.locator('[data-status="vue-second"]').textContent()) !==
    'independent'
  ) {
    throw new Error('Vue canvas instance state leaked')
  }

  await verifyPackedUI(page, 'vue')

  await first.locator('[data-fit="vue-first"]').click()
  await page.waitForFunction(
    () =>
      document.querySelector<HTMLElement>('[data-fit="vue-first"]')?.dataset
        .fitStatus === 'complete'
  )
  await page.evaluate(() => window.__flowVueConsumer?.dispose())
  await page.waitForFunction(
    () =>
      document.querySelectorAll('.flow-vue-node, [data-packed-ui]').length === 0
  )
}

const verifyFoldkit = async (page: Page) => {
  await verifyPurePathHelpers(page)

  const first = page
    .locator('.flow-foldkit-node[data-node-id="foldkit-a"]')
    .first()

  const canvases = page.locator('.flow-foldkit-canvas[data-flow-instance]')
  await first.waitFor()
  await page.evaluate(() => window.__flowFoldkitConsumer?.mountSecond())
  await page.waitForFunction(
    () =>
      document.querySelectorAll('.flow-foldkit-canvas[data-flow-instance]')
        .length === 2
  )

  const secondRuntime = canvases
    .nth(1)
    .locator('.flow-foldkit-node[data-node-id="foldkit-a"]')

  await secondRuntime.waitFor()

  if ((await page.locator('.flow-foldkit-node').count()) !== 4) {
    throw new Error(
      'Foldkit consumer did not mount two independent Runtime instances'
    )
  }

  if (
    (await first.evaluate((element) => getComputedStyle(element).position)) !==
    'absolute'
  ) {
    throw new Error('Foldkit package stylesheet was not applied')
  }

  await first.locator('[data-status="foldkit-a"]').waitFor()

  const measurement = await page.evaluate(() =>
    window.__flowFoldkitConsumer?.measure()
  )

  const [measurementStatus, measurementNodeId, measuredWidth, measuredHeight] =
    String(measurement).split(':')

  if (
    measurementStatus !== 'measured' ||
    measurementNodeId !== 'foldkit-a' ||
    Number(measuredWidth) <= 0 ||
    Number(measuredHeight) <= 0
  ) {
    throw new Error(
      `Foldkit public measurement observer returned ${String(measurement)}`
    )
  }

  const fitStatus = await page.evaluate(() =>
    window.__flowFoldkitConsumer?.fit()
  )

  if (fitStatus !== 'accepted' && fitStatus !== 'unchanged') {
    throw new Error(`Foldkit fitView returned ${String(fitStatus)}`)
  }

  const editStatus = await page.evaluate(() =>
    window.__flowFoldkitConsumer?.edit()
  )

  if (editStatus !== 'packed-ready') {
    throw new Error(`Foldkit public edit returned ${String(editStatus)}`)
  }

  await page.waitForFunction(
    () =>
      document.querySelector(
        '.flow-foldkit-canvas[data-flow-instance] [data-status="foldkit-a"]'
      )?.textContent === 'packed-ready'
  )

  if (
    (await secondRuntime.locator('[data-status="foldkit-a"]').textContent()) !==
    'waiting'
  ) {
    throw new Error('Foldkit Runtime A edit leaked into Runtime B')
  }

  const snapshots = await page.evaluate(() => {
    const consumer = window.__flowFoldkitConsumer

    if (consumer === undefined) {
      throw new Error('Missing packed snapshot client')
    }

    return Promise.all([
      consumer.snapshot('first'),
      consumer.snapshot('second'),
    ])
  })

  for (const [index, snapshot] of snapshots.entries()) {
    const expectedStatus = index === 0 ? 'packed-ready' : 'waiting'

    if (
      snapshot.status !== 'succeeded' ||
      snapshot.response.savedSession.version !== 1 ||
      snapshot.response.snapshot.document.nodes[0]?.data?.['status'] !==
        expectedStatus
    ) {
      throw new Error(
        `Packed ordinary legacy snapshot failed for owner ${index}`
      )
    }
  }

  await verifyPackedUI(page, 'foldkit')

  const disposed = await page.evaluate(() => {
    const consumer = window.__flowFoldkitConsumer

    if (consumer === undefined) {
      throw new Error('Missing packed snapshot client')
    }

    const pending = consumer.snapshot('first')
    consumer.dispose()

    return Promise.all([
      pending,
      consumer.snapshot('first'),
      consumer.snapshot('second'),
    ])
  })

  if (disposed.some((result) => result.status !== 'disposed')) {
    throw new Error(
      'Packed snapshot client did not settle pending and later requests on disposal'
    )
  }

  await page.waitForFunction(
    () =>
      document.querySelectorAll('.flow-foldkit-node, [data-packed-ui]')
        .length === 0
  )
}

const verifyBrowser = (
  consumerRoot: string,
  host: 'vanilla' | 'vue' | 'foldkit'
) =>
  Effect.tryPromise({
    try: async () => {
      console.log(`Opening ${host} archive consumer in Chromium`)

      const server = await createServer({
        configFile: false,
        logLevel: 'error',
        root: consumerRoot,
        resolve: { preserveSymlinks: false },
        server: {
          host: '127.0.0.1',
          port: 0,
          strictPort: false,
          fs: { strict: true, allow: [consumerRoot] },
        },
      })

      let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined

      try {
        await server.listen()

        const address = Schema.decodeUnknownSync(
          Schema.Struct({ address: Schema.String, port: Schema.Number })
        )(server.httpServer?.address())

        if (address === undefined) {
          throw new Error(
            `${host} packed consumer server did not expose a TCP address`
          )
        }

        console.log(`Launching Chromium for ${host} archive consumer`)
        browser = await chromium.launch()
        console.log(`Launched Chromium for ${host} archive consumer`)
        const page = await browser.newPage()
        page.setDefaultTimeout(10_000)
        page.setDefaultNavigationTimeout(10_000)
        const pageErrors: string[] = []
        page.on('pageerror', (error) => pageErrors.push(error.message))
        page.on('console', (message) => {
          if (message.type() === 'error') {
            pageErrors.push(message.text())
          }
        })
        console.log(`Navigating to ${host} archive consumer`)
        await page.goto(`http://127.0.0.1:${address.port}/`)
        console.log(`Navigated to ${host} archive consumer`)

        const verifyHost = {
          vanilla: verifyVanilla,
          vue: verifyVue,
          foldkit: verifyFoldkit,
        }[host]

        await verifyHost(page)

        if (pageErrors.length > 0) {
          throw new Error(
            `${host} packed browser errors: ${pageErrors.join('; ')}`
          )
        }

        return { host, browser: 'Chromium', pageErrors }
      } finally {
        await browser?.close()
        await server.close()
      }
    },
    catch: (error) => error,
  })

const peerResolutionCheck = String.raw`
import { realpathSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
const [adapter, peersJson] = process.argv.slice(1)
const peers = JSON.parse(peersJson)
const rootImporter = pathToFileURL(join(process.cwd(), 'package.json')).href
const adapterImporter = pathToFileURL(join(process.cwd(), 'node_modules', adapter, 'dist/public.js')).href
const packageMetadata = (resolvedEntry, expectedName) => {
  let current = dirname(realpathSync(resolvedEntry))
  while (current !== dirname(current)) {
    try {
      const metadata = JSON.parse(readFileSync(join(current, 'package.json'), 'utf8'))
      if (metadata.name === expectedName) return metadata
    } catch {}
    current = dirname(current)
  }
  throw new Error('Cannot locate installed package metadata for ' + expectedName)
}
const seen = {}
for (const [name, expectedVersion] of Object.entries(peers)) {
  const rootEntry = fileURLToPath(import.meta.resolve(name, rootImporter))
  const adapterEntry = fileURLToPath(import.meta.resolve(name, adapterImporter))
  const rootPath = realpathSync(rootEntry)
  const adapterPath = realpathSync(adapterEntry)
  const metadata = packageMetadata(rootEntry, name)
  if (rootPath !== adapterPath) throw new Error(name + ' resolves to different roots: ' + rootPath + ' vs ' + adapterPath)
  if (metadata.version !== expectedVersion) throw new Error(name + ' resolved version ' + metadata.version + ', expected ' + expectedVersion)
  seen[name] = { version: metadata.version, resolved: rootPath }
}
console.log(JSON.stringify(seen))
`

const program = Effect.gen(function* checkPackedConsumers() {
  const fileSystem = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  const childProcess = yield* ChildProcessSpawner.ChildProcessSpawner
  const root = yield* path.fromFileUrl(rootUrl)

  const temp = yield* fileSystem.makeTempDirectory({
    prefix: 'flow-packed-consumer-',
  })

  const tarballs = path.join(temp, 'tarballs')

  const run = (command: string, args: readonly string[], cwd: string) =>
    Effect.gen(function* runCommand() {
      const exitCode = yield* childProcess.exitCode(
        ChildProcess.make(command, args, {
          cwd,
          stderr: 'inherit',
          stdout: 'inherit',
        })
      )

      if (exitCode !== 0) {
        return yield* Effect.die(
          new Error(
            `${command} ${args.join(' ')} failed in ${cwd} with exit code ${exitCode}`
          )
        )
      }
    })

  const pack = (source: PackagePath) =>
    Effect.try({
      try: () => {
        const packageName = packageNames[source]

        if (packageName === undefined) {
          throw new Error(`No package name configured for ${source}`)
        }

        const packed = Bun.spawnSync(
          ['bun', 'pm', 'pack', '--destination', tarballs, '--quiet'],
          { cwd: path.join(root, source), stdout: 'pipe', stderr: 'pipe' }
        )

        const output = packed.stdout.toString().trim()

        if (packed.exitCode !== 0 || output.length === 0) {
          throw new Error(
            `bun pm pack failed for ${source}: ${packed.stderr.toString()}`
          )
        }

        const filename = output
          .split(/[\\/\r\n]/u)
          .findLast((segment) => segment.length > 0)

        if (filename === undefined) {
          throw new Error(`No archive filename returned for ${source}`)
        }

        checkPackageArchive(path.join(tarballs, filename), packageName)

        return filename
      },
      catch: (error) => error,
    })

  const checkPeers = (
    consumerRoot: string,
    adapter: string,
    peers: Readonly<Record<string, string>>
  ) =>
    run(
      'bun',
      ['-e', peerResolutionCheck, adapter, JSON.stringify(peers)],
      consumerRoot
    )

  const use = Effect.gen(function* useTemporaryConsumers() {
    yield* fileSystem.makeDirectory(tarballs, { recursive: true })

    const archives = {
      core: yield* pack('packages/core'),
      workflow: yield* pack('packages/workflow'),
      vanilla: yield* pack('apps/vanilla'),
      vue: yield* pack('packages/vue'),
      foldkit: yield* pack('packages/foldkit'),
    }

    yield* Effect.log(`Packed archive metadata: ${JSON.stringify(archives)}`)

    const genericRoot = path.join(temp, 'generic-core')
    yield* fileSystem.makeDirectory(genericRoot, { recursive: true })
    yield* fileSystem.writeFileString(
      path.join(genericRoot, 'package.json'),
      JSON.stringify({
        name: 'flow-core-without-workflow-consumer',
        private: true,
        type: 'module',
        dependencies: {
          '@flow/core': `file:../tarballs/${archives.core}`,
          effect: '4.0.0',
        },
      })
    )
    yield* run('bun', ['install', '--no-save', '--no-progress'], genericRoot)
    yield* run(
      'bun',
      [
        '-e',
        `
      const { decodeFlowDocument } = await import('@flow/core');
      const { Effect } = await import('effect');
      const graph = await Effect.runPromise(decodeFlowDocument({
        nodes: [{ id: 'generic', label: 'Generic', position: { x: 0, y: 0 } }],
        edges: [],
      }));
      if (graph.nodes[0]?.label !== 'Generic') throw new Error('Generic graph decode failed');
      const workflowInstalled = await Promise.resolve().then(() => import.meta.resolve('@flow/workflow')).then(() => true, () => false);
      if (workflowInstalled) throw new Error('Generic consumer unexpectedly installed workflow');
    `,
      ],
      genericRoot
    )
    yield* Effect.log(
      'Packed core consumer decoded a generic graph with workflow absent'
    )

    const consumers = [
      {
        host: 'vanilla' as const,
        adapter: '@flow/vanilla',
        fixture: 'tests/consumer',
        files: [
          'index.html',
          'main.ts',
          'consumer.typecheck.ts',
          'styles.d.ts',
          'tutorial-first-canvas.ts',
          'tsconfig.json',
        ],
        peers: { effect: '4.0.0' },
      },
      {
        host: 'vue' as const,
        adapter: '@flow/vue',
        fixture: 'tests/consumer/vue',
        files: [
          'index.html',
          'main.ts',
          'consumer.typecheck.ts',
          'styles.d.ts',
          'tsconfig.json',
        ],
        peers: { effect: '4.0.0', vue: '3.5.44' },
      },
      {
        host: 'foldkit' as const,
        adapter: '@flow/foldkit',
        fixture: 'tests/consumer/foldkit',
        files: [
          'index.html',
          'main.ts',
          'consumer.typecheck.ts',
          'styles.d.ts',
          'tsconfig.json',
        ],
        peers: {
          effect: '4.0.0',
          foldkit: '0.169.0',
          '@effect/platform-browser': '4.0.0',
        },
      },
    ]

    const selectedHost = Bun.env['FLOW_CONSUMER_HOST']

    const selectedConsumers =
      selectedHost === undefined
        ? consumers
        : consumers.filter(({ host }) => host === selectedHost)

    if (selectedConsumers.length === 0) {
      return yield* Effect.die(
        new Error(`Unknown FLOW_CONSUMER_HOST: ${selectedHost}`)
      )
    }

    for (const consumer of selectedConsumers) {
      const consumerRoot = path.join(temp, 'consumers', consumer.host)
      yield* fileSystem.makeDirectory(consumerRoot, { recursive: true })

      const archivePath = (name: keyof typeof archives) =>
        `file:../../tarballs/${archives[name]}`

      const dependencies = {
        '@flow/core': archivePath('core'),
        '@flow/workflow': archivePath('workflow'),
        [consumer.adapter]: archivePath(consumer.host),
        effect: '4.0.0',
      }

      if (consumer.host === 'vue') {
        Object.assign(dependencies, { vue: '3.5.44' })
      }

      if (consumer.host === 'foldkit') {
        Object.assign(dependencies, {
          foldkit: '0.169.0',
          '@effect/platform-browser': '4.0.0',
        })
      }

      if (
        Object.values(dependencies).some((value) =>
          value.startsWith('workspace:')
        )
      ) {
        return yield* Effect.die(
          new Error(
            `${consumer.host} consumer has a workspace dependency alias`
          )
        )
      }

      const overrides = { '@flow/core': archivePath('core') }
      yield* fileSystem.writeFileString(
        path.join(consumerRoot, 'package.json'),
        JSON.stringify(
          {
            name: `flow-packed-${consumer.host}-consumer`,
            private: true,
            type: 'module',
            dependencies,
            overrides,
          },
          null,
          2
        )
      )

      for (const file of consumer.files) {
        const contents = yield* fileSystem.readFileString(
          path.join(root, consumer.fixture, file)
        )

        yield* fileSystem.writeFileString(
          path.join(consumerRoot, file),
          contents
        )
      }

      for (const file of [
        'typed-data-factory.types.ts',
        'typed-data-factory.runtime.ts',
        'typed-flow-actor.types.ts',
        'typed-flow-actor.runtime.ts',
        'marker-configuration.types.ts',
        'marker-configuration.runtime.ts',
        'workflow-contracts.runtime.ts',
        'workflow-ai.runtime.ts',
      ]) {
        const contents = yield* fileSystem.readFileString(
          path.join(root, 'tests/consumer', file)
        )

        yield* fileSystem.writeFileString(
          path.join(consumerRoot, file),
          contents
        )
      }

      yield* run('bun', ['install', '--no-save', '--no-progress'], consumerRoot)
      yield* run('bun', ['-e', "await import('@flow/core')"], consumerRoot)
      yield* checkPeers(consumerRoot, consumer.adapter, consumer.peers)
      yield* run('bun', ['typed-data-factory.runtime.ts'], consumerRoot)
      yield* run('bun', ['typed-flow-actor.runtime.ts'], consumerRoot)
      yield* run('bun', ['marker-configuration.runtime.ts'], consumerRoot)
      yield* run('bun', ['workflow-contracts.runtime.ts'], consumerRoot)
      yield* run('bun', ['workflow-ai.runtime.ts'], consumerRoot)
      yield* run(
        'bun',
        [
          'run',
          path.join(root, 'node_modules/typescript/bin/tsc'),
          '--project',
          path.join(consumerRoot, 'tsconfig.json'),
        ],
        consumerRoot
      )
      yield* verifyBrowser(consumerRoot, consumer.host)
      yield* Effect.log(
        `Packed ${consumer.adapter} consumer passed install, peer resolution, typecheck, styles, browser behavior, and disposal`
      )
    }
  })

  yield* Effect.ensuring(
    use,
    fileSystem.remove(temp, { force: true, recursive: true }).pipe(Effect.orDie)
  )
})

BunRuntime.runMain(program.pipe(Effect.provide(BunServices.layer)))
