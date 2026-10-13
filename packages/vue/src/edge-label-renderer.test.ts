import { Predicate } from 'effect'
import { describe, expect, it } from 'vitest'
import { defineAsyncComponent, defineComponent, h } from 'vue'

import {
  createRendererPropsCache,
  declaredRendererProps,
} from './edge-label-renderer.ts'

const rendererProps = { id: 'a', selected: true, dragging: false, zIndex: 2 }

const FunctionalNode = () => h('div')

describe(declaredRendererProps, () => {
  it('passes only the props a component declares', () => {
    const Node = defineComponent({
      props: { selected: Boolean },
      setup: () => () => null,
    })

    expect(declaredRendererProps(Node, rendererProps)).toStrictEqual({
      selected: true,
    })
  })

  it('includes props declared through extends and mixins', () => {
    const Base = defineComponent({ props: { id: String } })
    const Mixin = { props: ['dragging'] }

    const Node = defineComponent({
      extends: Base,
      mixins: [Mixin],
      props: { zIndex: Number },
      setup: () => () => null,
    })

    expect(declaredRendererProps(Node, rendererProps)).toStrictEqual({
      id: 'a',
      dragging: false,
      zIndex: 2,
    })
  })

  it('gives functional components without declared props everything', () => {
    expect(declaredRendererProps(FunctionalNode, rendererProps)).toBe(
      rendererProps
    )
  })

  it('uses the resolved component of a loaded async component', async () => {
    const Inner = defineComponent({
      props: { selected: Boolean },
      setup: () => () => null,
    })

    const Async = defineAsyncComponent(() => Promise.resolve(Inner))

    // Before loading nothing is declared, and the result is not cached.
    expect(declaredRendererProps(Async, rendererProps)).toStrictEqual({})

    const load: unknown =
      '__asyncLoader' in Async ? Async.__asyncLoader : undefined

    if (!Predicate.isFunction(load)) {
      throw new TypeError('Expected an async component loader')
    }

    await load()

    expect(declaredRendererProps(Async, rendererProps)).toStrictEqual({
      selected: true,
    })
  })
})

describe(createRendererPropsCache, () => {
  it('keeps the previous object while props are equal', () => {
    const cache = createRendererPropsCache<{ readonly x: number }>(
      (previous, next) => previous?.x === next.x
    )

    const first = cache.keep('a', { x: 1 })

    expect(cache.keep('a', { x: 1 })).toBe(first)
    expect(cache.keep('a', { x: 2 })).not.toBe(first)

    cache.retain(new Set())

    expect(cache.keep('a', { x: 2 })).toStrictEqual({ x: 2 })
  })
})
