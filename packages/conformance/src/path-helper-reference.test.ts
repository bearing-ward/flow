import { readFileSync } from 'node:fs'

import {
  getBezierPath,
  getSimpleBezierPath,
  getSmoothStepPath,
  getStraightPath,
  getEdgeCenter,
} from '@flow/core'
import { Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import {
  FixtureSchema,
  observe,
  pathCases,
} from '../../../research/harnesses/path-helper/cases.ts'

const fixture = S.decodeUnknownSync(FixtureSchema)(
  JSON.parse(
    readFileSync('research/fixtures/path-helper-reference.json', 'utf-8')
  )
)

const helpers = {
  getBezierPath,
  getSimpleBezierPath,
  getSmoothStepPath,
  getStraightPath,
  getEdgeCenter,
}

const replayCases = fixture.cases.map((record) => ({
  ...record,
  caseName: record.descriptor.id.replace('BUG-088-01-', 'same-side-'),
}))

const bugCases = replayCases.filter(({ descriptor }) =>
  descriptor.id.includes('BUG-088-01')
)

describe('captured same-side NaN predicate and finite controls', () => {
  it('retains all four same-side pairs and independent NaN operands plus finite controls', () => {
    expect(bugCases).toHaveLength(24)

    for (const side of ['left', 'right', 'top', 'bottom']) {
      for (const suffix of [
        'source-NaN',
        'target-NaN',
        'offset-NaN',
        'finite-gap-10',
        'finite-gap-20',
        'finite-gap-30',
      ]) {
        expect(
          bugCases.some(
            ({ descriptor }) =>
              descriptor.id === `getSmoothStepPath/BUG-088-01-${side}-${suffix}`
          )
        ).toBeTruthy()
      }
    }
  })

  it.each(bugCases)(
    '$caseName same-side NaN and finite controls',
    ({ descriptor, outcome }) => {
      expect(observe(helpers[descriptor.helper], descriptor)).toStrictEqual(
        outcome
      )
    }
  )
})

describe('pure path helper captured numeric full tuples', () => {
  it('preserves every ordered capture descriptor identity and presence tag', () => {
    expect(fixture.cases.map(({ descriptor }) => descriptor)).toStrictEqual(
      pathCases
    )
    expect(new Set(pathCases.map(({ id }) => id)).size).toBe(pathCases.length)
  })

  it('records genuine pinned package and two-process equality', () => {
    expect(fixture.metadata.upstreamSha).toBe(
      '0a1f9575b25679f2880175de8d3eae21aedde921'
    )
    expect(fixture.metadata.package).toBe('@xyflow/react')
    expect(fixture.metadata.version).toBe('12.11.6')
    expect(fixture.metadata.twoProcessEqual).toBeTruthy()
  })

  it.each(
    replayCases.filter(({ descriptor }) => descriptor.domain === 'numeric')
  )('$caseName exact full tuple', ({ descriptor, outcome }) => {
    expect(observe(helpers[descriptor.helper], descriptor)).toStrictEqual(
      outcome
    )
  })

  it('retains outside-type observations separately without changing the numeric contract', () => {
    const observations = fixture.cases.filter(
      ({ descriptor }) => descriptor.domain === 'outside-type'
    )

    expect(observations.length).toBeGreaterThan(0)
    expect(
      observations.map(({ descriptor }) => ({
        id: descriptor.id,
        actual: observe(helpers[descriptor.helper], descriptor),
      }))
    ).toHaveLength(observations.length)
  })
})

const capturedOutcome = (id: string) => {
  const record = fixture.cases.find(({ descriptor }) => descriptor.id === id)

  if (record === undefined) {
    throw new Error(`Missing sensitivity case ${id}`)
  }

  return record.outcome
}

describe('captured helper branch sensitivity and defaults', () => {
  it('changes backwards curvature controls while positive control distances ignore curvature', () => {
    expect(capturedOutcome('getBezierPath/backwards-0')).not.toStrictEqual(
      capturedOutcome('getBezierPath/backwards-0.5')
    )
    expect(capturedOutcome('getBezierPath/positive-0')).toStrictEqual(
      capturedOutcome('getBezierPath/positive-0.5')
    )
  })

  it('defaults each omitted side independently and retains JavaScript own-undefined behavior', () => {
    for (const helper of [
      'getBezierPath',
      'getSimpleBezierPath',
      'getSmoothStepPath',
    ]) {
      expect(capturedOutcome(`${helper}/omitted-source`)).toStrictEqual(
        capturedOutcome(`${helper}/sides-forward-bottom-left`)
      )
      expect(capturedOutcome(`${helper}/omitted-target`)).toStrictEqual(
        capturedOutcome(`${helper}/sides-forward-right-top`)
      )
      expect(capturedOutcome(`${helper}/omitted-both`)).toStrictEqual(
        capturedOutcome(`${helper}/sides-forward-bottom-top`)
      )
      expect(
        capturedOutcome(`${helper}/sourcePosition-own-undefined`)
      ).toStrictEqual(capturedOutcome(`${helper}/omitted-both`))
      expect(
        capturedOutcome(`${helper}/targetPosition-own-undefined`)
      ).toStrictEqual(capturedOutcome(`${helper}/omitted-both`))
    }
  })

  it('ignores centers and step interpolation on same-side and orthogonal routes', () => {
    for (const route of ['same', 'orthogonal']) {
      for (const suffix of [
        'centerX-0',
        'centerY-0',
        'centers-33',
        'stepPosition--0.5',
      ]) {
        expect(
          capturedOutcome(`getSmoothStepPath/${route}-${suffix}`)
        ).toStrictEqual(capturedOutcome(`getSmoothStepPath/${route}-default`))
      }
    }
  })

  it('changes relevant opposite-route options and retains endpoint offsets after a center override', () => {
    const baseline = capturedOutcome(
      'getSmoothStepPath/oppositeHorizontal-default'
    )

    const override = capturedOutcome(
      'getSmoothStepPath/oppositeHorizontal-centerX-0'
    )

    if (baseline.kind !== 'return' || override.kind !== 'return') {
      throw new Error('Expected opposite route tuples')
    }

    expect(override).not.toStrictEqual(baseline)
    expect(override.tuple.slice(3)).toStrictEqual(baseline.tuple.slice(3))
    expect(
      capturedOutcome('getSmoothStepPath/oppositeHorizontal-stepPosition-0')
    ).not.toStrictEqual(
      capturedOutcome('getSmoothStepPath/oppositeHorizontal-stepPosition-1')
    )
    expect(
      capturedOutcome('getSmoothStepPath/oppositeHorizontal-borderRadius-0')
    ).not.toStrictEqual(
      capturedOutcome('getSmoothStepPath/oppositeHorizontal-default')
    )
  })

  it('maps the five helper-only aliases to complete tuples without inventing a dispatcher', () => {
    for (const [actual, expected] of [
      ['getBezierPath/alias-default', 'getBezierPath/forward'],
      ['getSimpleBezierPath/alias-simplebezier', 'getSimpleBezierPath/forward'],
      [
        'getSmoothStepPath/alias-step',
        'getSmoothStepPath/oppositeVertical-borderRadius-0',
      ],
      ['getSmoothStepPath/alias-smoothstep', 'getSmoothStepPath/forward'],
      ['getStraightPath/alias-straight', 'getStraightPath/forward'],
    ]) {
      if (actual === undefined || expected === undefined) {
        throw new Error('Missing alias observation identity')
      }

      expect(capturedOutcome(actual)).toStrictEqual(capturedOutcome(expected))
    }
  })
})
