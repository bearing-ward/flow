import { readFileSync } from 'node:fs'

import { Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import { FixtureSchema } from '../../../research/harnesses/origin-connection/fixture-schema.ts'
import type { Observation } from '../../../research/harnesses/origin-connection/fixture-schema.ts'

const fixture = S.decodeUnknownSync(FixtureSchema)(
  JSON.parse(
    readFileSync('research/fixtures/origin-connection-reference.json', 'utf-8')
  )
)

const sample = (name: string) => {
  const found = fixture.samples.find(
    (candidate) => candidate.request.name === name
  )

  if (found === undefined) {
    throw new Error(`Missing captured scenario ${name}`)
  }

  return found
}

const phase = (name: string, phaseName: string): Observation => {
  const found = sample(name).phases.find(
    (candidate) => candidate.name === phaseName
  )

  if (found === undefined) {
    throw new Error(`Missing captured phase ${name}/${phaseName}`)
  }

  return found.observation
}

const node = (observation: Observation, id: string) => {
  const found = observation.nodes.find((candidate) => candidate.id === id)

  if (found === undefined) {
    throw new Error(`Missing captured node ${id}`)
  }

  return found
}

const value = (name: string, nameOfPhase = 'free') =>
  phase(`line-${name}`, nameOfPhase).previewPath

describe('pinned public origin and connection capture', () => {
  it('requires the full pin, two independent equal samples and the complete bounded scenario matrix', () => {
    expect({
      sha: fixture.metadata.upstreamSha,
      version: fixture.metadata.version,
      runs: fixture.metadata.captureRuns,
      equal: fixture.repeatedCaptureMatches,
    }).toStrictEqual({
      sha: '0a1f9575b25679f2880175de8d3eae21aedde921',
      version: '12.11.6',
      runs: 2,
      equal: true,
    })
    expect(
      new Set(fixture.samples.map(({ request }) => request.name)).size
    ).toBe(33)
    expect(fixture.unverified.length).toBeGreaterThan(0)
  })

  it.each(['0,0', '0.5,0.5', '1,1', '-0.5,1.5'])(
    'translates root and child anchors, honors override, and preserves toObject positions: %s',
    (originName) => {
      const { request } = sample(`origin-${originName}`)
      const observation = phase(`origin-${originName}`, 'idle')
      const parent = node(observation, 'parent')
      const child = node(observation, 'a')
      const target = node(observation, 'b')
      expect([parent.position, child.position, target.position]).toStrictEqual([
        { x: 300, y: 260 },
        { x: 100, y: 80 },
        { x: 800, y: 260 },
      ])
      expect([
        parent.absolutePosition,
        child.absolutePosition,
        target.absolutePosition,
      ]).toStrictEqual([
        { x: 300 - 200 * request.origin[0], y: 260 - 160 * request.origin[1] },
        {
          x: 300 - 200 * request.origin[0] + 100 - 120,
          y: 260 - 160 * request.origin[1] + 80,
        },
        { x: 800 - 120 * request.origin[0], y: 260 - 80 * request.origin[1] },
      ])
      expect({
        childOrigin: child.origin,
        parentId: child.parentId,
        own: observation.nodes.map(({ ownOrigin }) => ownOrigin),
      }).toStrictEqual({
        childOrigin: [1, 0],
        parentId: 'parent',
        own: [false, true, false],
      })
      expect(
        observation.nodes.map(
          ({ domBounds, absolutePosition, width, height }) => ({
            x: domBounds.x - 40,
            y: domBounds.y - 50,
            width: domBounds.width,
            height: domBounds.height,
            absolutePosition,
            measured: { width, height },
          })
        )
      ).toStrictEqual(
        observation.nodes.map(({ absolutePosition, width, height }) => ({
          ...absolutePosition,
          width,
          height,
          absolutePosition,
          measured: { width, height },
        }))
      )
      expect(
        observation.renderedEdges.map(({ start, end }) => ({ start, end }))
      ).toStrictEqual([
        {
          start: {
            x: child.absolutePosition.x + child.width + 5,
            y: child.absolutePosition.y + child.height / 4,
          },
          end: {
            x: target.absolutePosition.x - 5,
            y: target.absolutePosition.y + target.height * 0.75,
          },
        },
      ])
    }
  )

  it.each([
    ['strict-source-source', false, 0, null],
    ['strict-source-target', true, 1, 'a'],
    ['strict-target-source', true, 1, 'b'],
    ['strict-target-target', false, 0, null],
    ['loose-source-source', true, 1, 'a'],
    ['loose-source-target', true, 1, 'a'],
    ['loose-target-source', true, 1, 'b'],
    ['loose-target-target', true, 0, 'b'],
  ] as const)(
    'separates gesture eligibility, direction and rendered acceptance: %s',
    (name, valid, paths, source) => {
      const hover = phase(name, 'hover')
      const released = phase(name, 'released')
      expect(hover.state.isValid).toBe(valid)
      expect(
        released.connections.map(({ source: actual }) => actual)
      ).toStrictEqual(source === null ? [] : [source])
      expect({
        edges: released.edges.length,
        paths: released.renderedEdges.length,
        errors: released.errors,
      }).toStrictEqual({
        edges: valid ? 1 : 0,
        paths,
        errors: name === 'loose-target-target' ? ['008'] : [],
      })
      expect(released.state.inProgress).toBeFalsy()
      expect(released.previewPath).toBeNull()
    }
  )

  it.each(['strict', 'loose'])(
    'rejects the same physical handle without adding an edge: %s',
    (mode) => {
      const released = phase(`${mode}-same-physical`, 'released')
      expect({
        callbacks: released.connections,
        edges: released.edges,
        rendered: released.renderedEdges,
        errors: released.errors,
      }).toStrictEqual({ callbacks: [], edges: [], rendered: [], errors: [] })
      expect(
        phase(`${mode}-same-physical`, 'free').state.inProgress
      ).toBeTruthy()
    }
  )

  it('distinguishes null requests on named handles from genuinely unnamed physical handles', () => {
    const unnamed = phase('unnamed-physical', 'released')
    const named = phase('null-request-named-physical', 'added')
    expect(unnamed.connections).toStrictEqual([
      { source: 'a', target: 'b', sourceHandle: null, targetHandle: null },
    ])
    expect([
      node(unnamed, 'a').handles.map(({ id }) => id),
      node(named, 'a').handles.map(({ id }) => id),
    ]).toStrictEqual([
      [null, null],
      ['out', 'in'],
    ])
    expect([unnamed.edges, named.edges]).toStrictEqual([
      [
        {
          source: 'a',
          target: 'b',
          ownSourceHandle: false,
          ownTargetHandle: false,
        },
      ],
      [
        {
          source: 'a',
          target: 'b',
          ownSourceHandle: false,
          ownTargetHandle: false,
        },
      ],
    ])
    expect([
      unnamed.renderedEdges.length,
      named.renderedEdges.length,
    ]).toStrictEqual([1, 1])
  })

  it('starts immediately at threshold0 but only strictly above threshold1, then clears without a connection', () => {
    expect(
      ['pressed', 'exact-one', 'above-one'].map(
        (name) => phase('threshold-0', name).state.inProgress
      )
    ).toStrictEqual([true, true, true])
    expect(
      ['pressed', 'exact-one', 'above-one'].map(
        (name) => phase('threshold-1', name).state.inProgress
      )
    ).toStrictEqual([false, false, true])
    expect(
      [0, 1].map((threshold) => {
        const released = phase(`threshold-${threshold}`, 'released')

        return {
          starts: released.starts,
          ends: released.ends,
          connections: released.connections,
          edges: released.edges,
          preview: released.previewPath,
        }
      })
    ).toStrictEqual(
      [0, 1].map(() => ({
        starts: 1,
        ends: 1,
        connections: [],
        edges: [],
        preview: null,
      }))
    )
  })

  it.each([0.5, 2])(
    'uses graph-space radius20 inclusive under zoom, with actual integer event displacement: %s',
    (zoom) => {
      const inside = phase(`radius-${zoom}-19`, 'radius-hover')
      const boundary = phase(`radius-${zoom}-20`, 'radius-hover')
      const outside = phase(`radius-${zoom}-22`, 'radius-hover')

      if (boundary.state.pointer === null || outside.state.pointer === null) {
        throw new Error('Missing radius pointer')
      }

      const target = node(boundary, 'b')
      const centerY = target.absolutePosition.y + target.height * 0.75
      expect(
        (boundary.state.pointer.y - boundary.viewport.y) / zoom - centerY
      ).toBe(20)
      expect(
        (outside.state.pointer.y - outside.viewport.y) / zoom - centerY
      ).toBe(22)
      expect([
        inside.state.isValid,
        boundary.state.isValid,
        outside.state.isValid,
      ]).toStrictEqual([true, true, null])
      expect([
        phase(`radius-${zoom}-19`, 'released').connections.length,
        phase(`radius-${zoom}-22`, 'released').connections.length,
      ]).toStrictEqual([1, 0])
    }
  )

  it('defaults to Bezier and keeps simple, straight, zero-radius step and rounded step distinct', () => {
    expect(value('absent')).toBe(value('default'))
    expect(value('absent')).toMatch(/^M270,200 C320,200 320,260 370,260$/u)
    expect({
      straight: value('straight'),
      step: value('step'),
      rounded: value('smoothstep'),
    }).toStrictEqual({
      straight: 'M 270,200L 370,260',
      step: 'M270 200L290 200L 320,200Q 320,200 320,200L 320,260Q 320,260 320,260L350 260L370 260',
      rounded:
        'M270 200L290 200L 315,200Q 320,200 320,205L 320,255Q 320,260 325,260L350 260L370 260',
    })
    expect(value('default', 'backward')).not.toBe(
      value('simplebezier', 'backward')
    )
    expect(
      [
        'absent',
        'default',
        'straight',
        'step',
        'smoothstep',
        'simplebezier',
      ].map((name) => phase(`line-${name}`, 'cancelled-release').previewPath)
    ).toStrictEqual([null, null, null, null, null, null])
  })

  it('keeps custom callback geometry in graph space while pointer remains container-local, with valid/invalid/null distinctions', () => {
    const free = phase('custom-valid', 'free')
    const valid = phase('custom-valid', 'hover')
    const invalid = phase('custom-invalid', 'hover')

    if (
      valid.custom === null ||
      invalid.custom === null ||
      valid.custom.toHandle === null
    ) {
      throw new Error('Missing native custom callback')
    }

    expect([
      free.custom?.status,
      valid.custom.status,
      invalid.custom.status,
    ]).toStrictEqual([null, 'valid', 'invalid'])
    expect({
      callbackFrom: valid.custom.from,
      hookFrom: valid.state.from,
      callbackPointer: valid.custom.pointer,
      hookPointer: valid.state.pointer,
      callbackTo: valid.custom.to,
      hookTo: valid.state.to,
    }).toStrictEqual({
      callbackFrom: { x: 270, y: 200 },
      hookFrom: { x: 270, y: 200 },
      callbackPointer: { x: 1364, y: 690 },
      hookPointer: { x: 1364, y: 690 },
      callbackTo: { x: 650, y: 320 },
      hookTo: { x: 650, y: 320 },
    })
    expect({
      target: valid.custom.to,
      actualHandle: { x: valid.custom.toHandle.x, y: valid.custom.toHandle.y },
      invalidTo: invalid.custom.to,
      invalidPointerGraph: {
        x:
          (invalid.custom.pointer.x - invalid.viewport.x) /
          invalid.viewport.zoom,
        y:
          (invalid.custom.pointer.y - invalid.viewport.y) /
          invalid.viewport.zoom,
      },
    }).toStrictEqual({
      target: { x: 650, y: 320 },
      actualHandle: { x: 650, y: 320 },
      invalidTo: { x: 662, y: 320 },
      invalidPointerGraph: { x: 662, y: 320 },
    })
    expect({
      freeTarget: free.custom?.toNode,
      freeHandle: free.custom?.toHandle,
      line: valid.custom.lineType,
      ownStyle: valid.custom.ownLineStyle,
      stroke: valid.custom.stroke,
      container: valid.containerStyle,
      pathStyle: valid.pathStyle,
    }).toStrictEqual({
      freeTarget: null,
      freeHandle: null,
      line: 'smoothstep',
      ownStyle: true,
      stroke: '#123456',
      container: 'opacity: 0.4;',
      pathStyle: 'stroke: rgb(18, 52, 86); stroke-width: 3;',
    })
    expect(phase('custom-invalid', 'released').connections).toStrictEqual([])
  })

  it('passes absent custom styling as absent while retaining the native default line enum', () => {
    const hover = phase('custom-absent-style', 'hover')
    expect({
      type: hover.custom?.lineType,
      own: hover.custom?.ownLineStyle,
      stroke: hover.custom?.stroke,
      pathStyle: hover.pathStyle,
      containerStyle: hover.containerStyle,
    }).toStrictEqual({
      type: 'default',
      own: false,
      stroke: undefined,
      pathStyle: null,
      containerStyle: null,
    })
    expect(hover.custom?.status).toBe('valid')
  })

  it('preserves invalid hover node/handle while the preview side follows the opposite source side', () => {
    const invalid = phase('strict-source-source', 'hover').state
    expect({
      node: invalid.toNode,
      handle: invalid.toHandle?.id,
      actualSide: invalid.toHandle?.side,
      previewSide: invalid.toPosition,
      valid: invalid.isValid,
    }).toStrictEqual({
      node: 'b',
      handle: 'out',
      actualSide: 'right',
      previewSide: 'left',
      valid: false,
    })
    expect(phase('line-absent', 'idle').state).toStrictEqual({
      inProgress: false,
      isValid: null,
      from: null,
      to: null,
      pointer: null,
      fromNode: null,
      toNode: null,
      fromHandle: null,
      toHandle: null,
      fromPosition: null,
      toPosition: null,
    })
  })
})
