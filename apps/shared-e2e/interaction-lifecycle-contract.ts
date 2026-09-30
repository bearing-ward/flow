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

export const interactionReconnectionCases =
  interactionLifecycleFixture.reconnectionCases

export const interactionCancellationRetryCases =
  interactionLifecycleFixture.cancellationRetryCases
