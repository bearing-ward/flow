import { decodeFlowDocument } from '@flow/core'
import { FlowCanvas, FlowPlaceholder, useFlow } from '@flow/vue'
import { Effect } from 'effect'
import { createApp, defineComponent, h, onBeforeUnmount, ref } from 'vue'

import '@flow/vue/style.css'

const document = Effect.runSync(decodeFlowDocument({ nodes: [], edges: [] }))

const Recipe = defineComponent({
  setup() {
    const flow = useFlow()
    const active = ref(true)
    const status = ref('')

    const stopState = flow.subscribeState(({ current }) => {
      if (current.document.nodes.some((node) => node.selected === true)) {
        status.value = 'selected:true'
      }
    })

    onBeforeUnmount(stopState)

    const activate = async (): Promise<void> => {
      if (!active.value) {
        return
      }

      active.value = false

      try {
        const accepted = await flow.addNodes({
          id: 'placeholder-created',
          label: 'Created from empty state',
          position: { x: 120, y: 120 },
        })

        status.value = `accepted:${accepted.document.nodes.length}`
      } catch {
        active.value = true
        status.value = 'rejected'
      }
    }

    return () =>
      h('main', { class: 'flow-vue-placeholder-page' }, [
        active.value ? h(FlowPlaceholder, { onActivate: activate }) : null,
        h('output', { 'aria-live': 'polite' }, status.value),
      ])
  },
})

const documentRoot = globalThis.document.querySelector<HTMLElement>('#app')

if (documentRoot === null) {
  throw new Error('Missing Vue Placeholder root')
}

const app = createApp(
  defineComponent(
    () => () => h(FlowCanvas, { document }, { default: () => h(Recipe) })
  )
)

app.mount(documentRoot)

globalThis.addEventListener('pagehide', () => app.unmount(), { once: true })
