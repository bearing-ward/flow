import type {
  FlowConnectionState,
  FlowEdge,
  FlowInteractivity,
  FlowNode,
  Viewport,
} from '@flow/core'
import {
  computed,
  inject,
  onScopeDispose,
  readonly,
  ref,
  shallowReadonly,
  shallowRef,
  toValue,
  watch,
} from 'vue'
import type { DeepReadonly, MaybeRefOrGetter, Ref, ShallowRef } from 'vue'

import { observeKeyPress } from './key-press-observer.ts'
import type { FlowKeyCode, FlowKeyPressOptions } from './key-press-observer.ts'
import { FlowEditorKey } from './use-flow.ts'

/**
 * The state `useStore` selectors read: the accepted snapshot plus live
 * connection and interaction switches. It mirrors the public parts of the
 * React Flow store; raw `setState` stays private (see `useStoreApi`).
 */
export interface FlowStoreState {
  readonly nodes: readonly DeepReadonly<FlowNode>[]
  readonly edges: readonly DeepReadonly<FlowEdge>[]
  readonly viewport: DeepReadonly<Viewport>
  /** React `transform`: `[x, y, zoom]`. */
  readonly transform: readonly [number, number, number]
  readonly connection: FlowConnectionState
  readonly nodesDraggable: boolean
  readonly nodesConnectable: boolean
  readonly elementsSelectable: boolean
  readonly interactivity: FlowInteractivity
  /** Measured node sizes by id. */
  readonly measured: ReadonlyMap<
    string,
    { readonly width: number; readonly height: number }
  >
}

const noMeasurements: FlowStoreState['measured'] = new Map()

/**
 * React Flow `useStore(selector, equalityFn)`: a ref holding the selected
 * value, replaced only when `equality(previous, next)` is false. The
 * default equality is `Object.is`, as React's.
 */
export const useStore = <Selected>(
  selector: (state: FlowStoreState) => Selected,
  equality: (previous: Selected, next: Selected) => boolean = Object.is
): Readonly<ShallowRef<Selected>> => {
  const editor = inject(FlowEditorKey)

  if (editor === undefined) {
    throw new Error(
      'useStore must be called in setup() below a FlowCanvas or FlowProvider'
    )
  }

  const state = computed((): FlowStoreState => {
    const { document, viewport } = editor.snapshot.value
    const interactivity = editor.interactivity.value

    return {
      nodes: document.nodes,
      edges: document.edges,
      viewport,
      transform: [viewport.x, viewport.y, viewport.zoom],
      connection: editor.connectionState.value,
      nodesDraggable: interactivity.nodesDraggable,
      nodesConnectable: interactivity.nodesConnectable,
      elementsSelectable: interactivity.elementsSelectable,
      interactivity,
      measured: editor.measuredSizes?.value ?? noMeasurements,
    }
  })

  const selected = shallowRef(selector(state.value))

  watch(state, (next) => {
    const value = selector(next)

    if (!equality(selected.value, value)) {
      selected.value = value
    }
  })

  return shallowReadonly(selected)
}

/**
 * React Flow `useKeyPress(keyCode, options)`: a ref that is true while the
 * key or combination is held. Works with or without a canvas; the target
 * defaults to the document. A ref or getter `keyCode` re-subscribes.
 */
export const useKeyPress = (
  keyCode: MaybeRefOrGetter<FlowKeyCode>,
  options: FlowKeyPressOptions = {}
): Readonly<Ref<boolean>> => {
  const pressed = ref(false)
  let dispose: (() => void) | undefined

  watch(
    () => toValue(keyCode),
    (next) => {
      dispose?.()
      dispose = observeKeyPress(
        next,
        (value) => {
          pressed.value = value
        },
        options
      )
    },
    { immediate: true }
  )

  onScopeDispose(() => dispose?.())

  return readonly(pressed)
}
