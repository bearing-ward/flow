import { NodeIdSchema } from '@flow/core'
import { describe, expect, it } from 'vitest'

import { createFoldkitNodeInternalsRefresher } from './update-node-internals.ts'

describe('node internals refresh facade', () => {
  it('settles a failed host measurement dispatch without retrying it', () => {
    let dispatchAttempts = 0

    // SAFETY: the facade treats this value as an opaque host element.
    const mountedElement = {} as Element

    const refresher = createFoldkitNodeInternalsRefresher({
      resolveElement: () => mountedElement,
      measure: () => {
        dispatchAttempts += 1

        return false
      },
    })

    expect(refresher.refresh(NodeIdSchema.make('node'))).toStrictEqual({
      status: 'failed',
    })
    expect(dispatchAttempts).toBe(1)
  })

  it('does not dispatch after disposal', () => {
    let dispatchAttempts = 0

    const refresher = createFoldkitNodeInternalsRefresher({
      // SAFETY: the facade treats this value as an opaque host element.
      resolveElement: () => ({}) as Element,
      measure: () => {
        dispatchAttempts += 1

        return true
      },
    })

    refresher.dispose()

    expect(refresher.refresh(NodeIdSchema.make('node'))).toStrictEqual({
      status: 'disposed',
    })
    expect(dispatchAttempts).toBe(0)
  })
})
