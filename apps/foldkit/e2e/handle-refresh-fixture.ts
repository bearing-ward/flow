import '@flow/foldkit/style.css'
import '../src/playground.css'
import { decodeFlowDocument, flowNodeHandles, NodeIdSchema } from '@flow/core'
import type { FlowDocument } from '@flow/core'
import {
  createProgram,
  createFoldkitNodeMeasurementObserver,
  createFoldkitNodeInternalsRefresher,
  HostAction,
  defaultInteractionOptions,
  createFoldkitSnapshotClient,
} from '@flow/foldkit'
import type { VersionedSnapshotResponseSchema, ports } from '@flow/foldkit'
import { Effect, Exit, Match } from 'effect'
import { Runtime } from 'foldkit'

import { handleRefreshDocument } from '../../shared-e2e/handle-refresh-fixture.ts'

export const startHandleRefresh = async (
  zoom: number,
  controlled: boolean
): Promise<void> => {
  const owner = document.querySelector<HTMLElement>('#app')

  if (owner === null) {
    throw new Error('Missing Foldkit fixture owner')
  }

  owner.style.width = '1000px'
  owner.style.height = '650px'

  const mount = document.createElement('div')
  mount.id = 'handle-refresh-runtime'
  owner.replaceChildren(mount)

  const runtime = Runtime.embed<typeof ports, never, 'Element'>(
    createProgram(
      mount,
      Effect.runSync(decodeFlowDocument(handleRefreshDocument)),
      { x: 10, y: 20, zoom },
      ['target'],
      controlled ? 'controlled' : 'uncontrolled',
      controlled ? 'controlled' : 'uncontrolled',
      {},
      { minZoom: 0.25, maxZoom: 4 },
      'full',
      { ...defaultInteractionOptions, autoPanOnConnect: false }
    )
  )

  const client = createFoldkitSnapshotClient(runtime.ports)

  const request = async (
    nodeId?: string
  ): Promise<typeof VersionedSnapshotResponseSchema.Encoded> => {
    const result = await client.requestVersioned(
      nodeId === undefined ? {} : { nodeId }
    )

    return Match.value(result).pipe(
      Match.when({ status: 'succeeded' }, ({ response }) => response),
      Match.when({ status: 'failed' }, ({ reason }) => {
        throw new Error(`Foldkit snapshot failed: ${reason}`)
      }),
      Match.when({ status: 'disposed' }, () => {
        throw new Error('Foldkit snapshot owner disposed')
      }),
      Match.exhaustive
    )
  }

  const observer = createFoldkitNodeMeasurementObserver({
    owner,
    zoom: () => zoom,
    onMeasure: (requests) => {
      const sent = runtime.ports.actions.send(
        HostAction.MeasureNodes({ requests })
      )

      if (Exit.isFailure(sent)) {
        throw new Error('Foldkit fixture measurement failed')
      }
    },
  })

  const refresher = createFoldkitNodeInternalsRefresher({
    resolveElement: (nodeId) =>
      [
        ...owner.querySelectorAll<HTMLElement>('[data-testid="flow-node"]'),
      ].find((element) => element.dataset.nodeId === nodeId),
    measure: (element) => observer.measure(element),
  })

  const refreshReference = refresher.refresh

  const waitForDeclaredHandles = (nextDocument: FlowDocument): Promise<void> =>
    Effect.runPromise(
      Effect.callback((resume) => {
        const matches = () => {
          const nodes = [
            ...owner.querySelectorAll<HTMLElement>('[data-testid="flow-node"]'),
          ]

          return nextDocument.nodes
            .filter((node) => node.hidden !== true)
            .every((node) => {
              const element = nodes.find(
                (candidate) => candidate.dataset.nodeId === node.id
              )

              const actual = [
                ...(element?.querySelectorAll<HTMLElement>(
                  '[data-handle-id]'
                ) ?? []),
              ].map((handle) => handle.dataset.handleId)

              const expected = flowNodeHandles(node).map((handle) => handle.id)

              return (
                element !== undefined &&
                actual.length === expected.length &&
                expected.every((id) => actual.includes(id))
              )
            })
        }

        const check = (commitObserver: MutationObserver) => {
          if (matches()) {
            commitObserver.disconnect()
            resume(Effect.void)
          }
        }

        const renderObserver = new MutationObserver(
          (_records, commitObserver) => check(commitObserver)
        )

        renderObserver.observe(owner, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['data-node-id', 'data-handle-id'],
        })
        check(renderObserver)

        return Effect.sync(() => renderObserver.disconnect())
      }).pipe(Effect.asVoid)
    )

  window.__handleRefresh = {
    refresh: (ids) =>
      refresher.refresh(
        (Array.isArray(ids) ? ids : [ids]).map((id) => NodeIdSchema.make(id))
      ),
    internal: async (id) => {
      const response = await request(id)

      return response.internalNode
    },
    snapshot: async () => {
      const response = await request()

      return response.snapshot
    },
    preview: async () => {
      const response = await request()

      return response.connectionPreview
    },
    saved: async () => {
      const response = await request()

      return response.savedSession
    },
    replace: async (input) => {
      const nextDocument = Effect.runSync(decodeFlowDocument(input))
      runtime.ports.actions.send(
        HostAction.ReplaceDocument({ document: nextDocument })
      )
      await request()
      // Pinned packages/react/src/hooks/useUpdateNodeInternals.ts:67 measures after the DOM update, not the model acknowledgement.
      await waitForDeclaredHandles(nextDocument)
    },
    refreshIdentity: () => refreshReference === refresher.refresh,
    rejectInvalidHandleId: async (variant) => {
      const { snapshot } = await request()
      const candidate = Effect.runSync(decodeFlowDocument(snapshot.document))
      const action = HostAction.ReplaceDocument({ document: candidate })

      const handle = action.document.nodes.find(({ id }) => id === 'members')
        ?.handles?.[0]

      if (handle === undefined) {
        throw new Error('Missing invalid-ID candidate')
      }

      if (variant === 'missing') {
        Reflect.deleteProperty(handle, 'id')
      } else {
        Reflect.set(handle, 'id', variant === 'null' ? null : '')
      }

      return Exit.isFailure(runtime.ports.actions.send(action))
    },
    dispose: () => {
      refresher.dispose()
      observer.dispose()
      client.dispose()
      runtime.dispose()
    },
  }
  await request()
}
