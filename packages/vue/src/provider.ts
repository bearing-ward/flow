import {
  createFlowHistory,
  flowHistoryStatus,
  reduceFlowHistory,
  createFlowSnapshot,
  defaultFlowAriaLabelConfig,
  flowNoConnection,
  FlowAttribute,
  FlowSpan,
} from '@flow/core'
import type {
  ConnectionPreviewSnapshot,
  FlowInteractivity,
  FlowSnapshot,
} from '@flow/core'
import { Effect } from 'effect'
import {
  computed,
  defineComponent,
  inject,
  provide,
  shallowRef,
  watch,
} from 'vue'
import type { DeepReadonly, InjectionKey, ShallowRef } from 'vue'

import { FlowEditorKey } from './use-flow.ts'
import type { FlowEditor } from './use-flow.ts'

/**
 * What a `FlowProvider` holds: the editor of the canvas mounted below it.
 * A canvas registers on setup and unregisters when it unmounts.
 */
export interface FlowProviderContext {
  readonly editor: Readonly<ShallowRef<FlowEditor | undefined>>
  readonly register: (editor: FlowEditor) => () => void
}

export const FlowProviderKey: InjectionKey<FlowProviderContext | null> =
  Symbol('FlowProvider')

const emptySnapshot: DeepReadonly<FlowSnapshot> = createFlowSnapshot(
  { nodes: [], edges: [] },
  { x: 0, y: 0, zoom: 1 }
)

const emptyPreview: DeepReadonly<ConnectionPreviewSnapshot> = null

const emptyInteractivity: FlowInteractivity = {
  nodesDraggable: true,
  nodesConnectable: true,
  elementsSelectable: true,
}

const noMeasuredSizes: ReadonlyMap<
  string,
  { readonly width: number; readonly height: number }
> = new Map()

const missingCanvas = (member: string): Error =>
  new Error(`FlowProvider has no mounted FlowCanvas for ${member}`)

const recordProviderLifecycle = (message: string, registered: boolean): void =>
  Effect.runSync(
    Effect.logDebug(message).pipe(
      Effect.annotateLogs({ [FlowAttribute.inputKind]: 'provider' }),
      Effect.withSpan(registered ? FlowSpan.hostMount : FlowSpan.hostDestroy, {
        attributes: {
          [FlowAttribute.inputKind]: 'provider',
          [FlowAttribute.controlMode]: registered ? 'registered' : 'released',
        },
      })
    )
  )

/**
 * The editor `useFlow` sees below a provider. Reactive reads follow the
 * registered canvas and show an empty graph until one mounts; commands
 * require a mounted canvas.
 */
const createProviderEditor = (
  current: Readonly<ShallowRef<FlowEditor | undefined>>
): FlowEditor => {
  const target = (member: string): FlowEditor => {
    const editor = current.value

    if (editor === undefined) {
      throw missingCanvas(member)
    }

    return editor
  }

  const snapshot = computed(
    () => current.value?.snapshot.value ?? emptySnapshot
  )

  const interactivity = computed(
    () => current.value?.interactivity.value ?? emptyInteractivity
  )

  return {
    document: computed(() => snapshot.value.document),
    viewport: computed(() => snapshot.value.viewport),
    snapshot,
    history: computed(
      () =>
        current.value?.history?.value ??
        flowHistoryStatus(
          reduceFlowHistory(
            createFlowHistory({ nodes: [], edges: [] }, { capacity: 0 }),
            { kind: 'dispose' }
          ).state
        )
    ),
    animateNodePositions: (request) =>
      target('animateNodePositions').animateNodePositions?.(request) ??
      Promise.resolve({ revision: request.result.revision, kind: 'disposed' }),
    cancelNodeAnimation: () =>
      target('cancelNodeAnimation').cancelNodeAnimation?.(),
    copySelection: () => target('copySelection').copySelection?.() ?? null,
    pasteSelection: (options) =>
      target('pasteSelection').pasteSelection?.(options) ??
      Promise.reject(missingCanvas('pasteSelection')),
    setClipboardFragment: (input) =>
      target('setClipboardFragment').setClipboardFragment?.(input),
    undo: () => target('undo').undo?.() ?? Promise.resolve(),
    redo: () => target('redo').redo?.() ?? Promise.resolve(),
    rejectHistory: (id) => target('rejectHistory').rejectHistory?.(id),
    getDocumentRevision: () => current.value?.getDocumentRevision() ?? 0,
    beginDeleteApproval: () => target('deleteElements').beginDeleteApproval(),
    endDeleteApproval: () => current.value?.endDeleteApproval(),
    withEditMutation: (mutation) => target('edits').withEditMutation(mutation),
    connectionPreview: computed(
      () => current.value?.connectionPreview.value ?? emptyPreview
    ),
    connectionState: computed(
      () => current.value?.connectionState.value ?? flowNoConnection
    ),
    interactivity,
    setInteractivity: (next) =>
      target('setInteractivity').setInteractivity(next),
    reportError: (error, boundary) =>
      current.value?.reportError(error, boundary),
    subscribeState: (listener) => {
      let unsubscribe = current.value?.subscribeState(listener)

      const stop = watch(current, (editor) => {
        unsubscribe?.()
        unsubscribe = editor?.subscribeState(listener)
      })

      return () => {
        stop()

        return unsubscribe?.() ?? false
      }
    },
    subscribeSelection: (listener) => {
      let unsubscribe = current.value?.subscribeSelection(listener)

      const stop = watch(current, (editor) => {
        unsubscribe?.()
        unsubscribe = editor?.subscribeSelection(listener)
      })

      return () => {
        stop()

        return unsubscribe?.() ?? false
      }
    },
    observeKeyPress: (keyCode, options, listener) =>
      target('observeKeyPress').observeKeyPress(keyCode, options, listener),
    dispatch: (command) => target('dispatch').dispatch(command),
    updateDocument: (document, context) =>
      target('updateDocument').updateDocument(document, context),
    applyEdit: (transaction) => target('applyEdit').applyEdit(transaction),
    applyEditResolved: (resolve) =>
      target('applyEdit').applyEditResolved(resolve),
    updateViewport: (viewport) =>
      target('updateViewport').updateViewport(viewport),
    getViewport: () => current.value?.getViewport() ?? emptySnapshot.viewport,
    getViewportLimits: () =>
      current.value?.getViewportLimits?.() ?? { minZoom: 0.4, maxZoom: 2 },
    getZoom: () => current.value?.getZoom() ?? 1,
    viewportInitialized: () => current.value?.viewportInitialized() ?? false,
    screenToFlowPosition: (position) =>
      target('screenToFlowPosition').screenToFlowPosition(position),
    flowToScreenPosition: (position) =>
      target('flowToScreenPosition').flowToScreenPosition(position),
    setViewport: (viewport, options) =>
      target('setViewport').setViewport(viewport, options),
    zoomIn: (options) => target('zoomIn').zoomIn(options),
    zoomOut: (options) => target('zoomOut').zoomOut(options),
    zoomTo: (zoom, options) => target('zoomTo').zoomTo(zoom, options),
    setCenter: (x, y, options) => target('setCenter').setCenter(x, y, options),
    fitBounds: (bounds, options) =>
      target('fitBounds').fitBounds(bounds, options),
    fitView: (options) => target('fitView').fitView(options),
    getViewportForBounds: (bounds, options) =>
      current.value?.getViewportForBounds(bounds, options),
    publish: (change) => target('publish').publish(change),
    getInternalNode: (id) => current.value?.getInternalNode(id),
    getInternalNodes: () => current.value?.getInternalNodes?.() ?? new Map(),
    nodesInitialized: (options) =>
      current.value?.nodesInitialized(options) ?? false,
    updateNodeInternals: (nodeIds) =>
      target('updateNodeInternals').updateNodeInternals(nodeIds),
    measuredSizes: computed(
      () => current.value?.measuredSizes?.value ?? noMeasuredSizes
    ),
    ariaLabelConfig: computed(
      () => current.value?.ariaLabelConfig?.value ?? defaultFlowAriaLabelConfig
    ),
  }
}

/**
 * React Flow `ReactFlowProvider`: holds the editor of the `FlowCanvas` below
 * it, so `useFlow`, `useStore`, `useNodes` and the other composables work in
 * siblings of the canvas, such as a sidebar.
 *
 * One canvas per provider is the supported use, as in React. When several
 * canvases mount below one provider, siblings follow the most recently
 * mounted one that is still mounted; unmounting it falls back to the
 * previous one.
 */
export const FlowProvider = defineComponent({
  name: 'FlowProvider',
  setup(_props, { slots }) {
    const editor = shallowRef<FlowEditor>()
    const mounted: FlowEditor[] = []

    const register = (next: FlowEditor): (() => void) => {
      mounted.push(next)
      editor.value = next
      recordProviderLifecycle('Vue FlowProvider registered a canvas', true)

      return () => {
        const index = mounted.indexOf(next)

        if (index === -1) {
          return
        }

        mounted.splice(index, 1)
        editor.value = mounted.at(-1)
        recordProviderLifecycle('Vue FlowProvider released a canvas', false)
      }
    }

    provide(FlowProviderKey, { editor, register })
    provide(FlowEditorKey, createProviderEditor(editor))

    return () => slots.default?.()
  },
})

/** The nearest provider, or null inside a canvas or without one. */
export const injectFlowProvider = (): FlowProviderContext | null =>
  inject(FlowProviderKey, null)
