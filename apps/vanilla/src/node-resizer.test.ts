import { describe, expect, it } from 'vitest'

import {
  createFlowNodeResizeControl,
  createFlowNodeResizer,
} from './node-resizer.ts'
import type { FlowNodeResizerRegistration } from './resize-controls.ts'

/** A host that records registrations instead of rendering them. */
const recordingHost = () => {
  const registrations: (FlowNodeResizerRegistration | 'removed')[] = []

  return {
    registrations,
    registerNodeResizer: (
      _nodeId: string,
      registration: FlowNodeResizerRegistration
    ) => {
      registrations.push(registration)

      return {
        update: (next: FlowNodeResizerRegistration) => {
          registrations.push(next)
        },
        remove: () => {
          registrations.push('removed')
        },
      }
    },
  }
}

describe(createFlowNodeResizer, () => {
  it('registers React NodeResizer lines, handles and defaults', () => {
    const host = recordingHost()

    createFlowNodeResizer(host, 'n', { color: 'red', lineClassName: 'l' })

    const [registration] = host.registrations

    if (registration === undefined || registration === 'removed') {
      throw new Error('Expected a registration')
    }

    expect(
      registration.controls.map(
        ({ position, variant }) => `${variant}:${position}`
      )
    ).toStrictEqual([
      'line:top',
      'line:right',
      'line:bottom',
      'line:left',
      'handle:top-left',
      'handle:top-right',
      'handle:bottom-left',
      'handle:bottom-right',
    ])
    expect(registration.controls[0]?.className).toBe('l')
    expect(registration.controls[4]?.className).toBeUndefined()
    expect(registration.controls.map(({ color }) => color)).toStrictEqual(
      Array.from({ length: 8 }, () => 'red')
    )
  })

  it('applies React NodeResizer visibility, scaling and size defaults', () => {
    const host = recordingHost()

    createFlowNodeResizer(host, 'n')

    const [registration] = host.registrations

    if (registration === undefined || registration === 'removed') {
      throw new Error('Expected a registration')
    }

    expect(registration.isVisible).toBeTruthy()
    expect(registration.autoScale).toBeTruthy()
    expect(registration.constraints).toStrictEqual({
      minWidth: 10,
      minHeight: 10,
      maxWidth: Number.MAX_VALUE,
      maxHeight: Number.MAX_VALUE,
      keepAspectRatio: false,
    })
  })

  it('updates and removes its registration once', () => {
    const host = recordingHost()
    const mount = createFlowNodeResizer(host, 'n')

    mount.update({ isVisible: false, minWidth: 40 })
    mount.destroy()
    mount.destroy()
    mount.update({ isVisible: true })

    const [, updated, removed, extra] = host.registrations

    expect(updated !== 'removed' && updated?.isVisible).toBeFalsy()
    expect(updated !== 'removed' && updated?.constraints.minWidth).toBe(40)
    expect(removed).toBe('removed')
    expect(extra).toBeUndefined()
  })

  it('rejects invalid options at the boundary', () => {
    const host = recordingHost()

    expect(() =>
      // SAFETY: deliberately invalid input to exercise schema decoding.
      createFlowNodeResizer(host, 'n', { minWidth: -1 } as never)
    ).toThrow(/minWidth/u)
  })
})

describe(createFlowNodeResizeControl, () => {
  it('defaults to a bottom-right handle, or a right line for the line variant', () => {
    const host = recordingHost()

    createFlowNodeResizeControl(host, 'n')
    createFlowNodeResizeControl(host, 'n', {
      variant: 'line',
      resizeDirection: 'horizontal',
    })

    const [handle, line] = host.registrations

    if (
      handle === undefined ||
      handle === 'removed' ||
      line === undefined ||
      line === 'removed'
    ) {
      throw new Error('Expected registrations')
    }

    expect(handle.controls).toStrictEqual([
      expect.objectContaining({ position: 'bottom-right', variant: 'handle' }),
    ])
    expect(line.controls).toStrictEqual([
      expect.objectContaining({ position: 'right', variant: 'line' }),
    ])
    expect(line.resizeDirection).toBe('horizontal')
  })
})
