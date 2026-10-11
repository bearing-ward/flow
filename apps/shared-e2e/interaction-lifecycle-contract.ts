import { readFileSync } from 'node:fs'

import { Schema as S } from 'effect'

import { InteractionLifecycleFixtureSchema } from '../../packages/conformance/src/index.ts'
import type { InteractionLifecycleFixture } from '../../packages/conformance/src/index.ts'

export const interactionLifecycleFixture: InteractionLifecycleFixture =
  S.decodeUnknownSync(InteractionLifecycleFixtureSchema)(
    JSON.parse(
      readFileSync('research/fixtures/interaction-lifecycle.json', 'utf-8')
    )
  )

export const interactionConnectionCases =
  interactionLifecycleFixture.connectionCases

// Preserve the immutable historical rejection. Current native hosts consume
// the separately reviewed named target-target acceptance contract.
export const currentNativeConnectionCases: InteractionLifecycleFixture['connectionCases'] =
  interactionConnectionCases.map((scenario) => {
    if (scenario.id !== 'loose-rejects-target-to-target-rendering-gap') {
      return scenario
    }

    const { reason: _historicalReason, ...current } = scenario

    return {
      ...current,
      id: 'loose-accepts-directed-named-target-to-target',
      outcome: 'accepted',
      expectedEdgeId: 'edge-1',
      eventOrder: ['connectStart', 'connect', 'connectEnd'],
    }
  })

export const interactionReconnectionCases =
  interactionLifecycleFixture.reconnectionCases

export const interactionCancellationRetryCases =
  interactionLifecycleFixture.cancellationRetryCases
