import {
  persistenceDocument,
  mutateSavedData,
} from '../../shared-e2e/versioned-persistence-proof.ts'
import { createFlow } from './public.ts'

export const runVersionedPersistenceProof = async () => {
  const root = document.createElement('div')
  root.style.width = '800px'
  root.style.height = '500px'
  document.body.append(root)

  const controller = await createFlow(root, persistenceDocument(false), {
    documentMode: 'controlled',
    viewport: {
      mode: 'controlled',
      initial: { x: 5, y: -7, zoom: 1.5 },
      limits: { minZoom: 0.25, maxZoom: 4 },
    },
  })

  let accepted = 0

  const stop = controller.subscribeState(() => {
    accepted += 1
  })

  try {
    const before = structuredClone(controller.getSnapshot())
    const legacy = controller.getSavedSession()
    const additive = controller.getVersionedSavedSession()
    const canonicalBefore = structuredClone(additive)
    mutateSavedData(legacy)
    mutateSavedData(additive)

    if (
      JSON.stringify(controller.getSnapshot()) !== JSON.stringify(before) ||
      accepted !== 0
    ) {
      throw new Error('Canonical save mutated accepted authority')
    }

    const proposal = await controller.prepareVersionedRestore({
      ...canonicalBefore,
      version: 2,
      document: persistenceDocument(true),
    })

    if (
      JSON.stringify(controller.getSnapshot()) !== JSON.stringify(before) ||
      accepted !== 0
    ) {
      throw new Error('Prepare activated controlled origin')
    }

    controller.update(proposal.document)
    controller.updateViewport(proposal.viewport)
    const extended = controller.getVersionedSavedSession()
    const extendedBefore = structuredClone(extended)
    const beforeMutation = structuredClone(controller.getSnapshot())
    const notifications = accepted
    mutateSavedData(extended)
    const fresh = controller.getVersionedSavedSession()

    if (
      JSON.stringify(fresh) !== JSON.stringify(extendedBefore) ||
      JSON.stringify(controller.getSnapshot()) !==
        JSON.stringify(beforeMutation) ||
      accepted !== notifications
    ) {
      throw new Error('Extended save mutated accepted authority')
    }

    let legacyCode: unknown

    try {
      controller.getSavedSession()
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        legacyCode = error.code
      } else {
        throw error
      }
    }

    let invalidRejected = false

    try {
      await controller.prepareVersionedRestore({ ...fresh, version: 3 })
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
    controller.destroy()
    root.remove()
  }
}
