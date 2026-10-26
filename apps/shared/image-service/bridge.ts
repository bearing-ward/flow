import {
  createFlowGraph,
  getFlowImageCaptureRouting,
  flowImageDocumentRevision,
  NodeIdSchema,
  isCurrentFlowImage,
  prepareFlowImageExport,
} from '@flow/core'
import type {
  FlowDocument,
  FlowEditTransaction,
  FlowHistoryStatus,
  FlowImageExportRequest,
  FlowImageExportOptions,
  FlowInternalNode,
  FlowRoutingResult,
  PreparedFlowImageExport,
} from '@flow/core'
import { Effect } from 'effect'

import { imageServiceRequest } from './document.ts'

import './style.css'

export interface ImageHostMount {
  readonly document: () => Promise<FlowDocument>
  readonly exportRequest: (
    options: FlowImageExportOptions
  ) => Promise<FlowImageExportRequest>
  readonly internals: () => Promise<readonly (FlowInternalNode | undefined)[]>
  readonly routing: (result: FlowRoutingResult | null) => void
  readonly subscribe: (listener: (document: FlowDocument) => void) => () => void
  readonly refresh: () => Promise<void>
  readonly edit: (transaction: FlowEditTransaction) => Promise<void>
  readonly history: () => Promise<FlowHistoryStatus>
  readonly undo: () => void
  readonly redo: () => void
  readonly dispose: () => void
}

export type MountImageHost = (
  root: HTMLElement,
  prepared: PreparedFlowImageExport
) => Promise<ImageHostMount>

declare global {
  // eslint-disable-next-line anti-slop/no-unknown-parameters -- Browser RPC accepts unknown and decodes it before host mounting.
  var flowImageHost:
    // eslint-disable-next-line anti-slop/no-unknown-parameters -- Capture RPC values are decoded by the browser route.
    { readonly render: (input: unknown) => Promise<void> } | undefined

  var flowImageDemo:
    | {
        readonly request: () => Promise<FlowImageExportRequest>
        readonly refresh: () => Promise<void>
        readonly edit: ImageHostMount['edit']
        readonly history: ImageHostMount['history']
        readonly undo: () => void
        readonly redo: () => void
        readonly dispose: () => void
      }
    | undefined
}

const frame = (): Promise<undefined> => {
  const { promise, resolve } = Promise.withResolvers<undefined>()
  requestAnimationFrame(() => resolve())

  return promise
}

const loadAsset = async (name: string): Promise<void> => {
  const response = await fetch(`/image-service/assets/${name}`)

  if (!response.ok) {
    throw new Error(`Missing approved asset: ${name}`)
  }

  if (name.endsWith('.svg') || name.endsWith('.png')) {
    const image = new Image()
    image.src = `/image-service/assets/${name}`
    await image.decode()
  }
}

/** The browser boundary mounts each framework's own renderer and waits for its geometry. */
export const installImageHost = async (
  host: FlowImageExportRequest['host'],
  mount: MountImageHost
): Promise<void> => {
  const root = document.querySelector<HTMLElement>('#capture')

  if (root === null) {
    throw new Error('Missing capture root')
  }

  let mounted: ImageHostMount | undefined
  let revision = 0
  let sequence = 0
  let disposed = false
  let pending: AbortController | undefined
  let imageUrl: string | undefined
  let unsubscribe: (() => void) | undefined
  let current = imageServiceRequest(host)
  const preview = document.querySelector<HTMLImageElement>('#server-image')
  const status = document.querySelector<HTMLOutputElement>('#image-status')

  const invalidate = (): void => {
    revision += 1
    pending?.abort()
    root.dataset.revision = String(revision)
  }

  // eslint-disable-next-line anti-slop/no-unknown-parameters -- Capture RPC decodes the request at this browser boundary.
  const render = async (input: unknown): Promise<void> => {
    const prepared = await Effect.runPromise(prepareFlowImageExport(input))
    unsubscribe?.()
    mounted?.dispose()
    root.replaceChildren()
    root.style.width = `${prepared.request.width}px`
    root.style.height = `${prepared.request.height}px`

    try {
      await Promise.all(
        [...new Set(['flow-mark.svg', ...prepared.request.assets])].map(
          loadAsset
        )
      )
      await document.fonts.load('16px FlowSans')
      await document.fonts.ready
    } catch (error_) {
      const error = new Error(String(error_))
      error.name = 'FlowImageAssetFailure'
      throw error
    }

    mounted = await mount(root, prepared)

    const visible = createFlowGraph(prepared.document).orderedNodes.filter(
      (item) => !item.hidden
    )

    for (let attempt = 0; attempt < 120; attempt += 1) {
      // eslint-disable-next-line no-await-in-loop -- Readiness must observe successive renderer frames.
      await frame()

      const ready = visible.every((item) =>
        [...root.querySelectorAll<HTMLElement>('[data-node-id]')].some(
          (element) => element.dataset.nodeId === item.id
        )
      )

      if (ready) {
        break
      }
    }

    for (const measurement of prepared.request.scene.measurements) {
      const element = [
        ...root.querySelectorAll<HTMLElement>('[data-node-id]'),
      ].find((item) => item.dataset.nodeId === measurement.nodeId)

      for (const handle of measurement.handles ?? []) {
        const target = [
          ...(element?.querySelectorAll<HTMLElement>('[data-handle-id]') ?? []),
        ].find((item) => item.dataset.handleId === handle.handleId)

        if (target !== undefined) {
          Object.assign(target.style, {
            left: `${handle.offset.x - (element?.clientLeft ?? 0)}px`,
            top: `${handle.offset.y - (element?.clientTop ?? 0)}px`,
            right: 'auto',
            bottom: 'auto',
            width: `${handle.width}px`,
            height: `${handle.height}px`,
            transform: 'translate(-50%, -50%)',
          })
        }
      }
    }

    await mounted.refresh()
    await frame()
    await frame()
    const internals = await mounted.internals()

    if (
      visible.some(
        (item) =>
          !internals.some(
            (node) =>
              node?.node.id === item.id && node.measurementStatus === 'measured'
          )
      )
    ) {
      throw new Error('Host did not publish all visible measurements')
    }

    mounted.routing(getFlowImageCaptureRouting(prepared, internals))
    await frame()
    await frame()

    root.dataset.ready = prepared.request.revision
    current = prepared.request
    let identity = flowImageDocumentRevision(await mounted.document())
    unsubscribe = mounted.subscribe((document) => {
      const next = flowImageDocumentRevision(document)

      if (identity !== next) {
        identity = next
        invalidate()
      }
    })
  }

  const request = (): Promise<FlowImageExportRequest> => {
    if (mounted === undefined) {
      throw new Error('Host has not mounted')
    }

    const { scene, host: _host, version: _version, ...settings } = current

    return mounted.exportRequest({
      ...settings,
      revision: String(revision),
      edgeRouting: scene.edgeRouting,
    })
  }

  const refresh = async (): Promise<void> => {
    pending?.abort()
    pending = new AbortController()
    const controller = pending
    sequence += 1
    const requested = { revision: String(revision), sequence }
    const serviceUrl = new URL('/render', location.href)
    serviceUrl.port = ['8081', '8082', '8083'].includes(location.port)
      ? '8080'
      : '4191'

    if (status !== null) {
      status.value = 'Rendering'
    }

    try {
      const snapshot = await request()

      const response = await fetch(
        new URLSearchParams(location.search).get('service') ?? serviceUrl.href,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(snapshot),
          signal: controller.signal,
        }
      )

      if (!response.ok) {
        throw new Error(await response.text())
      }

      const blob = await response.blob()

      if (
        disposed ||
        !isCurrentFlowImage(requested, {
          revision: String(revision),
          sequence,
        }) ||
        response.headers.get('X-Flow-Revision') !== requested.revision
      ) {
        return
      }

      if (imageUrl !== undefined) {
        URL.revokeObjectURL(imageUrl)
      }

      imageUrl = URL.createObjectURL(blob)

      if (preview !== null) {
        preview.src = imageUrl
        preview.dataset.revision = requested.revision
      }

      if (status !== null) {
        status.value = `Ready revision ${requested.revision}`
      }
    } catch (error) {
      if (
        !controller.signal.aborted &&
        !disposed &&
        status !== null &&
        requested.sequence === sequence
      ) {
        status.value = String(error)
      }
    }
  }

  const dispose = (): void => {
    if (disposed) {
      return
    }

    disposed = true
    pending?.abort()
    unsubscribe?.()
    mounted?.dispose()

    if (imageUrl !== undefined) {
      URL.revokeObjectURL(imageUrl)
    }

    globalThis.flowImageHost = undefined
    globalThis.flowImageDemo = undefined
  }

  globalThis.flowImageHost = { render }
  window.addEventListener('pagehide', dispose, { once: true })

  if (new URLSearchParams(location.search).has('capture')) {
    document.body.classList.add('capture-only')

    return
  }

  await render(current)
  globalThis.flowImageDemo = {
    request,
    refresh,
    edit: async (transaction) => {
      await mounted?.edit(transaction)
    },
    history: () => {
      if (mounted === undefined) {
        throw new Error('Host has not mounted')
      }

      return mounted.history()
    },
    undo: () => {
      mounted?.undo()
    },
    redo: () => {
      mounted?.redo()
    },
    dispose,
  }
  document.querySelector('#refresh-image')?.addEventListener('click', () => {
    void refresh()
  })
  document.querySelector('#edit-image')?.addEventListener('click', async () => {
    await globalThis.flowImageDemo?.edit({
      operations: [
        {
          kind: 'update-node',
          nodeId: NodeIdSchema.make('card'),
          patch: { label: `Edited revision ${revision + 1}` },
        },
      ],
    })
  })
  document
    .querySelector('#undo-image')
    ?.addEventListener('click', () => globalThis.flowImageDemo?.undo())
  document
    .querySelector('#redo-image')
    ?.addEventListener('click', () => globalThis.flowImageDemo?.redo())
}
