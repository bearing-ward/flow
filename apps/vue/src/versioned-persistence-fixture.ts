import { decodeFlowDocument } from '@flow/core'
import { FlowCanvas, useFlow } from '@flow/vue'
import { Effect } from 'effect'
import { createApp, defineComponent, h, nextTick, ref } from 'vue'

import {
  persistenceDocument,
  mutateSavedData,
} from '../../shared-e2e/versioned-persistence-proof.ts'

export const runVersionedPersistenceProof = async () => {
  const root = document.createElement('div')
  root.style.width = '800px'
  root.style.height = '500px'
  document.body.append(root)

  const documentState = ref(
    Effect.runSync(decodeFlowDocument(persistenceDocument(false)))
  )

  const pending = Promise.withResolvers<ReturnType<typeof useFlow>>()

  const probe = defineComponent({
    setup() {
      const flow = useFlow()
      pending.resolve(flow)

      return () => null
    },
  })

  const app = createApp(
    defineComponent({
      setup: () => () =>
        h(
          FlowCanvas,
          {
            document: documentState.value,
            documentMode: 'controlled',
            viewport: { x: 5, y: -7, zoom: 1.5 },
            viewportMode: 'controlled',
          },
          { default: () => h(probe) }
        ),
    })
  )

  app.mount(root)
  const flow = await pending.promise
  await nextTick()
  let accepted = 0

  const stop = flow.subscribeState(() => {
    accepted += 1
  })

  try {
    const before = structuredClone(flow.getSnapshot())
    const canonicalBefore = structuredClone(flow.getVersionedSavedSession())
    mutateSavedData(flow.getSavedSession())
    mutateSavedData(flow.getVersionedSavedSession())

    if (
      JSON.stringify(flow.getSnapshot()) !== JSON.stringify(before) ||
      accepted !== 0
    ) {
      throw new Error('Canonical Vue save mutated authority')
    }

    const proposal = await flow.prepareVersionedRestore({
      ...canonicalBefore,
      version: 2,
      document: persistenceDocument(true),
    })

    if (
      JSON.stringify(flow.getSnapshot()) !== JSON.stringify(before) ||
      accepted !== 0
    ) {
      throw new Error('Vue preparation activated controlled origin')
    }

    documentState.value = proposal.document
    await nextTick()
    await nextTick()
    const extendedBefore = structuredClone(flow.getVersionedSavedSession())
    const notifications = accepted
    const acceptedBefore = structuredClone(flow.getSnapshot())
    mutateSavedData(flow.getVersionedSavedSession())
    const fresh = flow.getVersionedSavedSession()

    if (
      JSON.stringify(fresh) !== JSON.stringify(extendedBefore) ||
      JSON.stringify(flow.getSnapshot()) !== JSON.stringify(acceptedBefore) ||
      accepted !== notifications
    ) {
      throw new Error('Extended Vue save mutated authority')
    }

    let legacyCode: unknown

    try {
      flow.getSavedSession()
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        legacyCode = error.code
      } else {
        throw error
      }
    }

    let invalidRejected = false

    try {
      await flow.prepareVersionedRestore({ ...fresh, version: 99 })
    } catch {
      invalidRejected = true
    }

    return {
      canonicalBefore,
      extendedBefore,
      fresh,
      legacyCode,
      invalidRejected,
      accepted,
      notifications,
      preparedOrigin: proposal.document.nodeOrigin,
    }
  } finally {
    stop()
    app.unmount()
    root.remove()
  }
}
