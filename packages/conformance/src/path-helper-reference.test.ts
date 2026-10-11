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

const bugCases = fixture.cases.filter(({ descriptor }) =>
  descriptor.id.includes('BUG-088-01')
)

describe('BUG-088-01 captured same-side NaN predicate and finite controls', () => {
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
    'BUG-088-01 $descriptor.id exact full tuple',
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
    fixture.cases.filter(({ descriptor }) => descriptor.domain === 'numeric')
  )('$descriptor.id exact full tuple', ({ descriptor, outcome }) => {
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

describe('original path-helper members against particular captured cases', () => {
  it('get-bezier-path::0curvature pinned full-tuple boundary', () => {
    for (const id of [
      'getBezierPath/backwards-default',
      'getBezierPath/backwards-0',
      'getBezierPath/backwards-0.5',
      'getBezierPath/backwards--0.5',
      'getBezierPath/curvature-own-undefined',
    ]) {
      const record = fixture.cases.find(
        ({ descriptor }) => descriptor.id === id
      )

      if (record === undefined) {
        throw new Error(`Missing captured member case ${id}`)
      }

      expect(
        observe(helpers[record.descriptor.helper], record.descriptor)
      ).toStrictEqual(record.outcome)
    }
  })

  it('get-bezier-path::0sourceposition pinned full-tuple boundary', () => {
    for (const id of [
      'getBezierPath/omitted-both',
      'getBezierPath/sides-forward-left-left',
      'getBezierPath/sides-forward-left-right',
      'getBezierPath/sides-forward-left-top',
      'getBezierPath/sides-forward-left-bottom',
      'getBezierPath/sides-forward-right-left',
      'getBezierPath/sides-forward-right-right',
      'getBezierPath/sides-forward-right-top',
      'getBezierPath/sides-forward-right-bottom',
      'getBezierPath/sides-forward-top-left',
      'getBezierPath/sides-forward-top-right',
      'getBezierPath/sides-forward-top-top',
      'getBezierPath/sides-forward-top-bottom',
      'getBezierPath/sides-forward-bottom-left',
      'getBezierPath/sides-forward-bottom-right',
      'getBezierPath/sides-forward-bottom-top',
      'getBezierPath/sides-forward-bottom-bottom',
      'getBezierPath/sourcePosition-own-undefined',
      'getBezierPath/omitted-source',
      'getBezierPath/omitted-target',
    ]) {
      const record = fixture.cases.find(
        ({ descriptor }) => descriptor.id === id
      )

      if (record === undefined) {
        throw new Error(`Missing captured member case ${id}`)
      }

      expect(
        observe(helpers[record.descriptor.helper], record.descriptor)
      ).toStrictEqual(record.outcome)
    }
  })

  it('get-bezier-path::0sourcex pinned full-tuple boundary', () => {
    for (const id of [
      'getBezierPath/forward',
      'getBezierPath/perturb-sourceX',
      'getBezierPath/sourceX-NaN',
      'getBezierPath/sourceX-plusInfinity',
      'getBezierPath/sourceX-minusInfinity',
      'getBezierPath/sourceX-negativeZero',
      'getBezierPath/sourceX-large',
    ]) {
      const record = fixture.cases.find(
        ({ descriptor }) => descriptor.id === id
      )

      if (record === undefined) {
        throw new Error(`Missing captured member case ${id}`)
      }

      expect(
        observe(helpers[record.descriptor.helper], record.descriptor)
      ).toStrictEqual(record.outcome)
    }
  })

  it('get-bezier-path::0sourcey pinned full-tuple boundary', () => {
    for (const id of [
      'getBezierPath/forward',
      'getBezierPath/perturb-sourceY',
      'getBezierPath/sourceY-NaN',
      'getBezierPath/sourceY-plusInfinity',
      'getBezierPath/sourceY-minusInfinity',
      'getBezierPath/sourceY-negativeZero',
      'getBezierPath/sourceY-large',
    ]) {
      const record = fixture.cases.find(
        ({ descriptor }) => descriptor.id === id
      )

      if (record === undefined) {
        throw new Error(`Missing captured member case ${id}`)
      }

      expect(
        observe(helpers[record.descriptor.helper], record.descriptor)
      ).toStrictEqual(record.outcome)
    }
  })

  it('get-bezier-path::0targetposition pinned full-tuple boundary', () => {
    for (const id of [
      'getBezierPath/omitted-both',
      'getBezierPath/sides-forward-left-left',
      'getBezierPath/sides-forward-left-right',
      'getBezierPath/sides-forward-left-top',
      'getBezierPath/sides-forward-left-bottom',
      'getBezierPath/sides-forward-right-left',
      'getBezierPath/sides-forward-right-right',
      'getBezierPath/sides-forward-right-top',
      'getBezierPath/sides-forward-right-bottom',
      'getBezierPath/sides-forward-top-left',
      'getBezierPath/sides-forward-top-right',
      'getBezierPath/sides-forward-top-top',
      'getBezierPath/sides-forward-top-bottom',
      'getBezierPath/sides-forward-bottom-left',
      'getBezierPath/sides-forward-bottom-right',
      'getBezierPath/sides-forward-bottom-top',
      'getBezierPath/sides-forward-bottom-bottom',
      'getBezierPath/targetPosition-own-undefined',
      'getBezierPath/omitted-source',
      'getBezierPath/omitted-target',
    ]) {
      const record = fixture.cases.find(
        ({ descriptor }) => descriptor.id === id
      )

      if (record === undefined) {
        throw new Error(`Missing captured member case ${id}`)
      }

      expect(
        observe(helpers[record.descriptor.helper], record.descriptor)
      ).toStrictEqual(record.outcome)
    }
  })

  it('get-bezier-path::0targetx pinned full-tuple boundary', () => {
    for (const id of [
      'getBezierPath/forward',
      'getBezierPath/perturb-targetX',
      'getBezierPath/targetX-NaN',
      'getBezierPath/targetX-plusInfinity',
      'getBezierPath/targetX-minusInfinity',
      'getBezierPath/targetX-negativeZero',
      'getBezierPath/targetX-large',
    ]) {
      const record = fixture.cases.find(
        ({ descriptor }) => descriptor.id === id
      )

      if (record === undefined) {
        throw new Error(`Missing captured member case ${id}`)
      }

      expect(
        observe(helpers[record.descriptor.helper], record.descriptor)
      ).toStrictEqual(record.outcome)
    }
  })

  it('get-bezier-path::0targety pinned full-tuple boundary', () => {
    for (const id of [
      'getBezierPath/forward',
      'getBezierPath/perturb-targetY',
      'getBezierPath/targetY-NaN',
      'getBezierPath/targetY-plusInfinity',
      'getBezierPath/targetY-minusInfinity',
      'getBezierPath/targetY-negativeZero',
      'getBezierPath/targetY-large',
    ]) {
      const record = fixture.cases.find(
        ({ descriptor }) => descriptor.id === id
      )

      if (record === undefined) {
        throw new Error(`Missing captured member case ${id}`)
      }

      expect(
        observe(helpers[record.descriptor.helper], record.descriptor)
      ).toStrictEqual(record.outcome)
    }
  })

  it('get-bezier-path::getBezierPath pinned full-tuple boundary', () => {
    for (const id of [
      'getBezierPath/forward',
      'getBezierPath/reverse',
      'getBezierPath/coincident',
      'getBezierPath/horizontal',
      'getBezierPath/vertical',
      'getBezierPath/zero',
      'getBezierPath/perturb-sourceX',
      'getBezierPath/perturb-sourceY',
      'getBezierPath/perturb-targetX',
      'getBezierPath/perturb-targetY',
      'getBezierPath/sourceX-NaN',
      'getBezierPath/sourceX-plusInfinity',
      'getBezierPath/sourceX-minusInfinity',
      'getBezierPath/sourceX-negativeZero',
      'getBezierPath/sourceX-large',
      'getBezierPath/sourceY-NaN',
      'getBezierPath/sourceY-plusInfinity',
      'getBezierPath/sourceY-minusInfinity',
      'getBezierPath/sourceY-negativeZero',
      'getBezierPath/sourceY-large',
      'getBezierPath/targetX-NaN',
      'getBezierPath/targetX-plusInfinity',
      'getBezierPath/targetX-minusInfinity',
      'getBezierPath/targetX-negativeZero',
      'getBezierPath/targetX-large',
      'getBezierPath/targetY-NaN',
      'getBezierPath/targetY-plusInfinity',
      'getBezierPath/targetY-minusInfinity',
      'getBezierPath/targetY-negativeZero',
      'getBezierPath/targetY-large',
      'getBezierPath/sides-forward-left-left',
      'getBezierPath/sides-forward-left-right',
      'getBezierPath/sides-forward-left-top',
      'getBezierPath/sides-forward-left-bottom',
      'getBezierPath/sides-forward-right-left',
      'getBezierPath/sides-forward-right-right',
      'getBezierPath/sides-forward-right-top',
      'getBezierPath/sides-forward-right-bottom',
      'getBezierPath/sides-forward-top-left',
      'getBezierPath/sides-forward-top-right',
      'getBezierPath/sides-forward-top-top',
      'getBezierPath/sides-forward-top-bottom',
      'getBezierPath/sides-forward-bottom-left',
      'getBezierPath/sides-forward-bottom-right',
      'getBezierPath/sides-forward-bottom-top',
      'getBezierPath/sides-forward-bottom-bottom',
      'getBezierPath/sides-reverse-left-left',
      'getBezierPath/sides-reverse-left-right',
      'getBezierPath/sides-reverse-left-top',
      'getBezierPath/sides-reverse-left-bottom',
      'getBezierPath/sides-reverse-right-left',
      'getBezierPath/sides-reverse-right-right',
      'getBezierPath/sides-reverse-right-top',
      'getBezierPath/sides-reverse-right-bottom',
      'getBezierPath/sides-reverse-top-left',
      'getBezierPath/sides-reverse-top-right',
      'getBezierPath/sides-reverse-top-top',
      'getBezierPath/sides-reverse-top-bottom',
      'getBezierPath/sides-reverse-bottom-left',
      'getBezierPath/sides-reverse-bottom-right',
      'getBezierPath/sides-reverse-bottom-top',
      'getBezierPath/sides-reverse-bottom-bottom',
      'getBezierPath/sides-coincident-left-left',
      'getBezierPath/sides-coincident-left-right',
      'getBezierPath/sides-coincident-left-top',
      'getBezierPath/sides-coincident-left-bottom',
      'getBezierPath/sides-coincident-right-left',
      'getBezierPath/sides-coincident-right-right',
      'getBezierPath/sides-coincident-right-top',
      'getBezierPath/sides-coincident-right-bottom',
      'getBezierPath/sides-coincident-top-left',
      'getBezierPath/sides-coincident-top-right',
      'getBezierPath/sides-coincident-top-top',
      'getBezierPath/sides-coincident-top-bottom',
      'getBezierPath/sides-coincident-bottom-left',
      'getBezierPath/sides-coincident-bottom-right',
      'getBezierPath/sides-coincident-bottom-top',
      'getBezierPath/sides-coincident-bottom-bottom',
      'getBezierPath/omitted-source',
      'getBezierPath/omitted-target',
      'getBezierPath/omitted-both',
      'getBezierPath/sourcePosition-own-undefined',
      'getBezierPath/targetPosition-own-undefined',
      'getBezierPath/backwards-default',
      'getBezierPath/backwards-0',
      'getBezierPath/backwards-0.25',
      'getBezierPath/backwards-0.5',
      'getBezierPath/backwards--0.5',
      'getBezierPath/positive-default',
      'getBezierPath/positive-0',
      'getBezierPath/positive-0.25',
      'getBezierPath/positive-0.5',
      'getBezierPath/positive--0.5',
      'getBezierPath/curvature-own-undefined',
      'getBezierPath/curvature-NaN',
      'getBezierPath/curvature-plusInfinity',
      'getBezierPath/curvature-minusInfinity',
      'getBezierPath/curvature-large',
      'getBezierPath/alias-default',
    ]) {
      const record = fixture.cases.find(
        ({ descriptor }) => descriptor.id === id
      )

      if (record === undefined) {
        throw new Error(`Missing captured member case ${id}`)
      }

      expect(
        observe(helpers[record.descriptor.helper], record.descriptor)
      ).toStrictEqual(record.outcome)
    }
  })

  it('get-simple-bezier-path::0sourceposition pinned full-tuple boundary', () => {
    for (const id of [
      'getSimpleBezierPath/omitted-both',
      'getSimpleBezierPath/sides-forward-left-left',
      'getSimpleBezierPath/sides-forward-left-right',
      'getSimpleBezierPath/sides-forward-left-top',
      'getSimpleBezierPath/sides-forward-left-bottom',
      'getSimpleBezierPath/sides-forward-right-left',
      'getSimpleBezierPath/sides-forward-right-right',
      'getSimpleBezierPath/sides-forward-right-top',
      'getSimpleBezierPath/sides-forward-right-bottom',
      'getSimpleBezierPath/sides-forward-top-left',
      'getSimpleBezierPath/sides-forward-top-right',
      'getSimpleBezierPath/sides-forward-top-top',
      'getSimpleBezierPath/sides-forward-top-bottom',
      'getSimpleBezierPath/sides-forward-bottom-left',
      'getSimpleBezierPath/sides-forward-bottom-right',
      'getSimpleBezierPath/sides-forward-bottom-top',
      'getSimpleBezierPath/sides-forward-bottom-bottom',
      'getSimpleBezierPath/sourcePosition-own-undefined',
      'getSimpleBezierPath/omitted-source',
      'getSimpleBezierPath/omitted-target',
    ]) {
      const record = fixture.cases.find(
        ({ descriptor }) => descriptor.id === id
      )

      if (record === undefined) {
        throw new Error(`Missing captured member case ${id}`)
      }

      expect(
        observe(helpers[record.descriptor.helper], record.descriptor)
      ).toStrictEqual(record.outcome)
    }
  })

  it('get-simple-bezier-path::0sourcex pinned full-tuple boundary', () => {
    for (const id of [
      'getSimpleBezierPath/forward',
      'getSimpleBezierPath/perturb-sourceX',
      'getSimpleBezierPath/sourceX-NaN',
      'getSimpleBezierPath/sourceX-plusInfinity',
      'getSimpleBezierPath/sourceX-minusInfinity',
      'getSimpleBezierPath/sourceX-negativeZero',
      'getSimpleBezierPath/sourceX-large',
    ]) {
      const record = fixture.cases.find(
        ({ descriptor }) => descriptor.id === id
      )

      if (record === undefined) {
        throw new Error(`Missing captured member case ${id}`)
      }

      expect(
        observe(helpers[record.descriptor.helper], record.descriptor)
      ).toStrictEqual(record.outcome)
    }
  })

  it('get-simple-bezier-path::0sourcey pinned full-tuple boundary', () => {
    for (const id of [
      'getSimpleBezierPath/forward',
      'getSimpleBezierPath/perturb-sourceY',
      'getSimpleBezierPath/sourceY-NaN',
      'getSimpleBezierPath/sourceY-plusInfinity',
      'getSimpleBezierPath/sourceY-minusInfinity',
      'getSimpleBezierPath/sourceY-negativeZero',
      'getSimpleBezierPath/sourceY-large',
    ]) {
      const record = fixture.cases.find(
        ({ descriptor }) => descriptor.id === id
      )

      if (record === undefined) {
        throw new Error(`Missing captured member case ${id}`)
      }

      expect(
        observe(helpers[record.descriptor.helper], record.descriptor)
      ).toStrictEqual(record.outcome)
    }
  })

  it('get-simple-bezier-path::0targetposition pinned full-tuple boundary', () => {
    for (const id of [
      'getSimpleBezierPath/omitted-both',
      'getSimpleBezierPath/sides-forward-left-left',
      'getSimpleBezierPath/sides-forward-left-right',
      'getSimpleBezierPath/sides-forward-left-top',
      'getSimpleBezierPath/sides-forward-left-bottom',
      'getSimpleBezierPath/sides-forward-right-left',
      'getSimpleBezierPath/sides-forward-right-right',
      'getSimpleBezierPath/sides-forward-right-top',
      'getSimpleBezierPath/sides-forward-right-bottom',
      'getSimpleBezierPath/sides-forward-top-left',
      'getSimpleBezierPath/sides-forward-top-right',
      'getSimpleBezierPath/sides-forward-top-top',
      'getSimpleBezierPath/sides-forward-top-bottom',
      'getSimpleBezierPath/sides-forward-bottom-left',
      'getSimpleBezierPath/sides-forward-bottom-right',
      'getSimpleBezierPath/sides-forward-bottom-top',
      'getSimpleBezierPath/sides-forward-bottom-bottom',
      'getSimpleBezierPath/targetPosition-own-undefined',
      'getSimpleBezierPath/omitted-source',
      'getSimpleBezierPath/omitted-target',
    ]) {
      const record = fixture.cases.find(
        ({ descriptor }) => descriptor.id === id
      )

      if (record === undefined) {
        throw new Error(`Missing captured member case ${id}`)
      }

      expect(
        observe(helpers[record.descriptor.helper], record.descriptor)
      ).toStrictEqual(record.outcome)
    }
  })

  it('get-simple-bezier-path::0targetx pinned full-tuple boundary', () => {
    for (const id of [
      'getSimpleBezierPath/forward',
      'getSimpleBezierPath/perturb-targetX',
      'getSimpleBezierPath/targetX-NaN',
      'getSimpleBezierPath/targetX-plusInfinity',
      'getSimpleBezierPath/targetX-minusInfinity',
      'getSimpleBezierPath/targetX-negativeZero',
      'getSimpleBezierPath/targetX-large',
    ]) {
      const record = fixture.cases.find(
        ({ descriptor }) => descriptor.id === id
      )

      if (record === undefined) {
        throw new Error(`Missing captured member case ${id}`)
      }

      expect(
        observe(helpers[record.descriptor.helper], record.descriptor)
      ).toStrictEqual(record.outcome)
    }
  })

  it('get-simple-bezier-path::0targety pinned full-tuple boundary', () => {
    for (const id of [
      'getSimpleBezierPath/forward',
      'getSimpleBezierPath/perturb-targetY',
      'getSimpleBezierPath/targetY-NaN',
      'getSimpleBezierPath/targetY-plusInfinity',
      'getSimpleBezierPath/targetY-minusInfinity',
      'getSimpleBezierPath/targetY-negativeZero',
      'getSimpleBezierPath/targetY-large',
    ]) {
      const record = fixture.cases.find(
        ({ descriptor }) => descriptor.id === id
      )

      if (record === undefined) {
        throw new Error(`Missing captured member case ${id}`)
      }

      expect(
        observe(helpers[record.descriptor.helper], record.descriptor)
      ).toStrictEqual(record.outcome)
    }
  })

  it('get-simple-bezier-path::getSimpleBezierPath pinned full-tuple boundary', () => {
    for (const id of [
      'getSimpleBezierPath/forward',
      'getSimpleBezierPath/reverse',
      'getSimpleBezierPath/coincident',
      'getSimpleBezierPath/horizontal',
      'getSimpleBezierPath/vertical',
      'getSimpleBezierPath/zero',
      'getSimpleBezierPath/perturb-sourceX',
      'getSimpleBezierPath/perturb-sourceY',
      'getSimpleBezierPath/perturb-targetX',
      'getSimpleBezierPath/perturb-targetY',
      'getSimpleBezierPath/sourceX-NaN',
      'getSimpleBezierPath/sourceX-plusInfinity',
      'getSimpleBezierPath/sourceX-minusInfinity',
      'getSimpleBezierPath/sourceX-negativeZero',
      'getSimpleBezierPath/sourceX-large',
      'getSimpleBezierPath/sourceY-NaN',
      'getSimpleBezierPath/sourceY-plusInfinity',
      'getSimpleBezierPath/sourceY-minusInfinity',
      'getSimpleBezierPath/sourceY-negativeZero',
      'getSimpleBezierPath/sourceY-large',
      'getSimpleBezierPath/targetX-NaN',
      'getSimpleBezierPath/targetX-plusInfinity',
      'getSimpleBezierPath/targetX-minusInfinity',
      'getSimpleBezierPath/targetX-negativeZero',
      'getSimpleBezierPath/targetX-large',
      'getSimpleBezierPath/targetY-NaN',
      'getSimpleBezierPath/targetY-plusInfinity',
      'getSimpleBezierPath/targetY-minusInfinity',
      'getSimpleBezierPath/targetY-negativeZero',
      'getSimpleBezierPath/targetY-large',
      'getSimpleBezierPath/sides-forward-left-left',
      'getSimpleBezierPath/sides-forward-left-right',
      'getSimpleBezierPath/sides-forward-left-top',
      'getSimpleBezierPath/sides-forward-left-bottom',
      'getSimpleBezierPath/sides-forward-right-left',
      'getSimpleBezierPath/sides-forward-right-right',
      'getSimpleBezierPath/sides-forward-right-top',
      'getSimpleBezierPath/sides-forward-right-bottom',
      'getSimpleBezierPath/sides-forward-top-left',
      'getSimpleBezierPath/sides-forward-top-right',
      'getSimpleBezierPath/sides-forward-top-top',
      'getSimpleBezierPath/sides-forward-top-bottom',
      'getSimpleBezierPath/sides-forward-bottom-left',
      'getSimpleBezierPath/sides-forward-bottom-right',
      'getSimpleBezierPath/sides-forward-bottom-top',
      'getSimpleBezierPath/sides-forward-bottom-bottom',
      'getSimpleBezierPath/sides-reverse-left-left',
      'getSimpleBezierPath/sides-reverse-left-right',
      'getSimpleBezierPath/sides-reverse-left-top',
      'getSimpleBezierPath/sides-reverse-left-bottom',
      'getSimpleBezierPath/sides-reverse-right-left',
      'getSimpleBezierPath/sides-reverse-right-right',
      'getSimpleBezierPath/sides-reverse-right-top',
      'getSimpleBezierPath/sides-reverse-right-bottom',
      'getSimpleBezierPath/sides-reverse-top-left',
      'getSimpleBezierPath/sides-reverse-top-right',
      'getSimpleBezierPath/sides-reverse-top-top',
      'getSimpleBezierPath/sides-reverse-top-bottom',
      'getSimpleBezierPath/sides-reverse-bottom-left',
      'getSimpleBezierPath/sides-reverse-bottom-right',
      'getSimpleBezierPath/sides-reverse-bottom-top',
      'getSimpleBezierPath/sides-reverse-bottom-bottom',
      'getSimpleBezierPath/sides-coincident-left-left',
      'getSimpleBezierPath/sides-coincident-left-right',
      'getSimpleBezierPath/sides-coincident-left-top',
      'getSimpleBezierPath/sides-coincident-left-bottom',
      'getSimpleBezierPath/sides-coincident-right-left',
      'getSimpleBezierPath/sides-coincident-right-right',
      'getSimpleBezierPath/sides-coincident-right-top',
      'getSimpleBezierPath/sides-coincident-right-bottom',
      'getSimpleBezierPath/sides-coincident-top-left',
      'getSimpleBezierPath/sides-coincident-top-right',
      'getSimpleBezierPath/sides-coincident-top-top',
      'getSimpleBezierPath/sides-coincident-top-bottom',
      'getSimpleBezierPath/sides-coincident-bottom-left',
      'getSimpleBezierPath/sides-coincident-bottom-right',
      'getSimpleBezierPath/sides-coincident-bottom-top',
      'getSimpleBezierPath/sides-coincident-bottom-bottom',
      'getSimpleBezierPath/omitted-source',
      'getSimpleBezierPath/omitted-target',
      'getSimpleBezierPath/omitted-both',
      'getSimpleBezierPath/sourcePosition-own-undefined',
      'getSimpleBezierPath/targetPosition-own-undefined',
      'getSimpleBezierPath/alias-simplebezier',
    ]) {
      const record = fixture.cases.find(
        ({ descriptor }) => descriptor.id === id
      )

      if (record === undefined) {
        throw new Error(`Missing captured member case ${id}`)
      }

      expect(
        observe(helpers[record.descriptor.helper], record.descriptor)
      ).toStrictEqual(record.outcome)
    }
  })

  it('get-smooth-step-path::0borderradius pinned full-tuple boundary', () => {
    for (const id of [
      'getSmoothStepPath/oppositeHorizontal-default',
      'getSmoothStepPath/oppositeHorizontal-borderRadius-0',
      'getSmoothStepPath/oppositeHorizontal-borderRadius-1000',
      'getSmoothStepPath/oppositeHorizontal-borderRadius--5',
      'getSmoothStepPath/borderRadius-own-undefined',
    ]) {
      const record = fixture.cases.find(
        ({ descriptor }) => descriptor.id === id
      )

      if (record === undefined) {
        throw new Error(`Missing captured member case ${id}`)
      }

      expect(
        observe(helpers[record.descriptor.helper], record.descriptor)
      ).toStrictEqual(record.outcome)
    }
  })

  it('get-smooth-step-path::0centerx pinned full-tuple boundary', () => {
    for (const id of [
      'getSmoothStepPath/oppositeHorizontal-default',
      'getSmoothStepPath/oppositeHorizontal-centerX-0',
      'getSmoothStepPath/oppositeHorizontal-centerX-23',
      'getSmoothStepPath/oppositeHorizontal-centers-33',
      'getSmoothStepPath/centerX-own-undefined',
    ]) {
      const record = fixture.cases.find(
        ({ descriptor }) => descriptor.id === id
      )

      if (record === undefined) {
        throw new Error(`Missing captured member case ${id}`)
      }

      expect(
        observe(helpers[record.descriptor.helper], record.descriptor)
      ).toStrictEqual(record.outcome)
    }
  })

  it('get-smooth-step-path::0centery pinned full-tuple boundary', () => {
    for (const id of [
      'getSmoothStepPath/oppositeVertical-default',
      'getSmoothStepPath/oppositeVertical-centerY-0',
      'getSmoothStepPath/oppositeVertical-centerY-37',
      'getSmoothStepPath/oppositeVertical-centers-33',
      'getSmoothStepPath/centerY-own-undefined',
    ]) {
      const record = fixture.cases.find(
        ({ descriptor }) => descriptor.id === id
      )

      if (record === undefined) {
        throw new Error(`Missing captured member case ${id}`)
      }

      expect(
        observe(helpers[record.descriptor.helper], record.descriptor)
      ).toStrictEqual(record.outcome)
    }
  })

  it('get-smooth-step-path::0offset pinned full-tuple boundary', () => {
    for (const id of [
      'getSmoothStepPath/same-default',
      'getSmoothStepPath/same-offset-0',
      'getSmoothStepPath/same-offset-35',
      'getSmoothStepPath/same-offset--10',
      'getSmoothStepPath/offset-own-undefined',
    ]) {
      const record = fixture.cases.find(
        ({ descriptor }) => descriptor.id === id
      )

      if (record === undefined) {
        throw new Error(`Missing captured member case ${id}`)
      }

      expect(
        observe(helpers[record.descriptor.helper], record.descriptor)
      ).toStrictEqual(record.outcome)
    }
  })

  it('get-smooth-step-path::0sourceposition pinned full-tuple boundary', () => {
    for (const id of [
      'getSmoothStepPath/omitted-both',
      'getSmoothStepPath/sides-forward-left-left',
      'getSmoothStepPath/sides-forward-left-right',
      'getSmoothStepPath/sides-forward-left-top',
      'getSmoothStepPath/sides-forward-left-bottom',
      'getSmoothStepPath/sides-forward-right-left',
      'getSmoothStepPath/sides-forward-right-right',
      'getSmoothStepPath/sides-forward-right-top',
      'getSmoothStepPath/sides-forward-right-bottom',
      'getSmoothStepPath/sides-forward-top-left',
      'getSmoothStepPath/sides-forward-top-right',
      'getSmoothStepPath/sides-forward-top-top',
      'getSmoothStepPath/sides-forward-top-bottom',
      'getSmoothStepPath/sides-forward-bottom-left',
      'getSmoothStepPath/sides-forward-bottom-right',
      'getSmoothStepPath/sides-forward-bottom-top',
      'getSmoothStepPath/sides-forward-bottom-bottom',
      'getSmoothStepPath/sourcePosition-own-undefined',
      'getSmoothStepPath/omitted-source',
      'getSmoothStepPath/omitted-target',
    ]) {
      const record = fixture.cases.find(
        ({ descriptor }) => descriptor.id === id
      )

      if (record === undefined) {
        throw new Error(`Missing captured member case ${id}`)
      }

      expect(
        observe(helpers[record.descriptor.helper], record.descriptor)
      ).toStrictEqual(record.outcome)
    }
  })

  it('get-smooth-step-path::0sourcex pinned full-tuple boundary', () => {
    for (const id of [
      'getSmoothStepPath/forward',
      'getSmoothStepPath/perturb-sourceX',
      'getSmoothStepPath/sourceX-NaN',
      'getSmoothStepPath/sourceX-plusInfinity',
      'getSmoothStepPath/sourceX-minusInfinity',
      'getSmoothStepPath/sourceX-negativeZero',
      'getSmoothStepPath/sourceX-large',
    ]) {
      const record = fixture.cases.find(
        ({ descriptor }) => descriptor.id === id
      )

      if (record === undefined) {
        throw new Error(`Missing captured member case ${id}`)
      }

      expect(
        observe(helpers[record.descriptor.helper], record.descriptor)
      ).toStrictEqual(record.outcome)
    }
  })

  it('get-smooth-step-path::0sourcey pinned full-tuple boundary', () => {
    for (const id of [
      'getSmoothStepPath/forward',
      'getSmoothStepPath/perturb-sourceY',
      'getSmoothStepPath/sourceY-NaN',
      'getSmoothStepPath/sourceY-plusInfinity',
      'getSmoothStepPath/sourceY-minusInfinity',
      'getSmoothStepPath/sourceY-negativeZero',
      'getSmoothStepPath/sourceY-large',
    ]) {
      const record = fixture.cases.find(
        ({ descriptor }) => descriptor.id === id
      )

      if (record === undefined) {
        throw new Error(`Missing captured member case ${id}`)
      }

      expect(
        observe(helpers[record.descriptor.helper], record.descriptor)
      ).toStrictEqual(record.outcome)
    }
  })

  it('get-smooth-step-path::0stepposition pinned full-tuple boundary', () => {
    for (const id of [
      'getSmoothStepPath/oppositeHorizontal-default',
      'getSmoothStepPath/oppositeHorizontal-stepPosition-0',
      'getSmoothStepPath/oppositeHorizontal-stepPosition-1',
      'getSmoothStepPath/oppositeHorizontal-stepPosition-0.25',
      'getSmoothStepPath/oppositeHorizontal-stepPosition--0.5',
      'getSmoothStepPath/oppositeHorizontal-stepPosition-1.5',
      'getSmoothStepPath/stepPosition-own-undefined',
    ]) {
      const record = fixture.cases.find(
        ({ descriptor }) => descriptor.id === id
      )

      if (record === undefined) {
        throw new Error(`Missing captured member case ${id}`)
      }

      expect(
        observe(helpers[record.descriptor.helper], record.descriptor)
      ).toStrictEqual(record.outcome)
    }
  })

  it('get-smooth-step-path::0targetposition pinned full-tuple boundary', () => {
    for (const id of [
      'getSmoothStepPath/omitted-both',
      'getSmoothStepPath/sides-forward-left-left',
      'getSmoothStepPath/sides-forward-left-right',
      'getSmoothStepPath/sides-forward-left-top',
      'getSmoothStepPath/sides-forward-left-bottom',
      'getSmoothStepPath/sides-forward-right-left',
      'getSmoothStepPath/sides-forward-right-right',
      'getSmoothStepPath/sides-forward-right-top',
      'getSmoothStepPath/sides-forward-right-bottom',
      'getSmoothStepPath/sides-forward-top-left',
      'getSmoothStepPath/sides-forward-top-right',
      'getSmoothStepPath/sides-forward-top-top',
      'getSmoothStepPath/sides-forward-top-bottom',
      'getSmoothStepPath/sides-forward-bottom-left',
      'getSmoothStepPath/sides-forward-bottom-right',
      'getSmoothStepPath/sides-forward-bottom-top',
      'getSmoothStepPath/sides-forward-bottom-bottom',
      'getSmoothStepPath/targetPosition-own-undefined',
      'getSmoothStepPath/omitted-source',
      'getSmoothStepPath/omitted-target',
    ]) {
      const record = fixture.cases.find(
        ({ descriptor }) => descriptor.id === id
      )

      if (record === undefined) {
        throw new Error(`Missing captured member case ${id}`)
      }

      expect(
        observe(helpers[record.descriptor.helper], record.descriptor)
      ).toStrictEqual(record.outcome)
    }
  })

  it('get-smooth-step-path::0targetx pinned full-tuple boundary', () => {
    for (const id of [
      'getSmoothStepPath/forward',
      'getSmoothStepPath/perturb-targetX',
      'getSmoothStepPath/targetX-NaN',
      'getSmoothStepPath/targetX-plusInfinity',
      'getSmoothStepPath/targetX-minusInfinity',
      'getSmoothStepPath/targetX-negativeZero',
      'getSmoothStepPath/targetX-large',
    ]) {
      const record = fixture.cases.find(
        ({ descriptor }) => descriptor.id === id
      )

      if (record === undefined) {
        throw new Error(`Missing captured member case ${id}`)
      }

      expect(
        observe(helpers[record.descriptor.helper], record.descriptor)
      ).toStrictEqual(record.outcome)
    }
  })

  it('get-smooth-step-path::0targety pinned full-tuple boundary', () => {
    for (const id of [
      'getSmoothStepPath/forward',
      'getSmoothStepPath/perturb-targetY',
      'getSmoothStepPath/targetY-NaN',
      'getSmoothStepPath/targetY-plusInfinity',
      'getSmoothStepPath/targetY-minusInfinity',
      'getSmoothStepPath/targetY-negativeZero',
      'getSmoothStepPath/targetY-large',
    ]) {
      const record = fixture.cases.find(
        ({ descriptor }) => descriptor.id === id
      )

      if (record === undefined) {
        throw new Error(`Missing captured member case ${id}`)
      }

      expect(
        observe(helpers[record.descriptor.helper], record.descriptor)
      ).toStrictEqual(record.outcome)
    }
  })

  it('get-smooth-step-path::getSmoothStepPath pinned full-tuple boundary', () => {
    for (const id of [
      'getSmoothStepPath/forward',
      'getSmoothStepPath/reverse',
      'getSmoothStepPath/coincident',
      'getSmoothStepPath/horizontal',
      'getSmoothStepPath/vertical',
      'getSmoothStepPath/zero',
      'getSmoothStepPath/perturb-sourceX',
      'getSmoothStepPath/perturb-sourceY',
      'getSmoothStepPath/perturb-targetX',
      'getSmoothStepPath/perturb-targetY',
      'getSmoothStepPath/sourceX-NaN',
      'getSmoothStepPath/sourceX-plusInfinity',
      'getSmoothStepPath/sourceX-minusInfinity',
      'getSmoothStepPath/sourceX-negativeZero',
      'getSmoothStepPath/sourceX-large',
      'getSmoothStepPath/sourceY-NaN',
      'getSmoothStepPath/sourceY-plusInfinity',
      'getSmoothStepPath/sourceY-minusInfinity',
      'getSmoothStepPath/sourceY-negativeZero',
      'getSmoothStepPath/sourceY-large',
      'getSmoothStepPath/targetX-NaN',
      'getSmoothStepPath/targetX-plusInfinity',
      'getSmoothStepPath/targetX-minusInfinity',
      'getSmoothStepPath/targetX-negativeZero',
      'getSmoothStepPath/targetX-large',
      'getSmoothStepPath/targetY-NaN',
      'getSmoothStepPath/targetY-plusInfinity',
      'getSmoothStepPath/targetY-minusInfinity',
      'getSmoothStepPath/targetY-negativeZero',
      'getSmoothStepPath/targetY-large',
      'getSmoothStepPath/sides-forward-left-left',
      'getSmoothStepPath/sides-forward-left-right',
      'getSmoothStepPath/sides-forward-left-top',
      'getSmoothStepPath/sides-forward-left-bottom',
      'getSmoothStepPath/sides-forward-right-left',
      'getSmoothStepPath/sides-forward-right-right',
      'getSmoothStepPath/sides-forward-right-top',
      'getSmoothStepPath/sides-forward-right-bottom',
      'getSmoothStepPath/sides-forward-top-left',
      'getSmoothStepPath/sides-forward-top-right',
      'getSmoothStepPath/sides-forward-top-top',
      'getSmoothStepPath/sides-forward-top-bottom',
      'getSmoothStepPath/sides-forward-bottom-left',
      'getSmoothStepPath/sides-forward-bottom-right',
      'getSmoothStepPath/sides-forward-bottom-top',
      'getSmoothStepPath/sides-forward-bottom-bottom',
      'getSmoothStepPath/sides-reverse-left-left',
      'getSmoothStepPath/sides-reverse-left-right',
      'getSmoothStepPath/sides-reverse-left-top',
      'getSmoothStepPath/sides-reverse-left-bottom',
      'getSmoothStepPath/sides-reverse-right-left',
      'getSmoothStepPath/sides-reverse-right-right',
      'getSmoothStepPath/sides-reverse-right-top',
      'getSmoothStepPath/sides-reverse-right-bottom',
      'getSmoothStepPath/sides-reverse-top-left',
      'getSmoothStepPath/sides-reverse-top-right',
      'getSmoothStepPath/sides-reverse-top-top',
      'getSmoothStepPath/sides-reverse-top-bottom',
      'getSmoothStepPath/sides-reverse-bottom-left',
      'getSmoothStepPath/sides-reverse-bottom-right',
      'getSmoothStepPath/sides-reverse-bottom-top',
      'getSmoothStepPath/sides-reverse-bottom-bottom',
      'getSmoothStepPath/sides-coincident-left-left',
      'getSmoothStepPath/sides-coincident-left-right',
      'getSmoothStepPath/sides-coincident-left-top',
      'getSmoothStepPath/sides-coincident-left-bottom',
      'getSmoothStepPath/sides-coincident-right-left',
      'getSmoothStepPath/sides-coincident-right-right',
      'getSmoothStepPath/sides-coincident-right-top',
      'getSmoothStepPath/sides-coincident-right-bottom',
      'getSmoothStepPath/sides-coincident-top-left',
      'getSmoothStepPath/sides-coincident-top-right',
      'getSmoothStepPath/sides-coincident-top-top',
      'getSmoothStepPath/sides-coincident-top-bottom',
      'getSmoothStepPath/sides-coincident-bottom-left',
      'getSmoothStepPath/sides-coincident-bottom-right',
      'getSmoothStepPath/sides-coincident-bottom-top',
      'getSmoothStepPath/sides-coincident-bottom-bottom',
      'getSmoothStepPath/omitted-source',
      'getSmoothStepPath/omitted-target',
      'getSmoothStepPath/omitted-both',
      'getSmoothStepPath/sourcePosition-own-undefined',
      'getSmoothStepPath/targetPosition-own-undefined',
      'getSmoothStepPath/oppositeHorizontal-default',
      'getSmoothStepPath/oppositeHorizontal-borderRadius-0',
      'getSmoothStepPath/oppositeHorizontal-borderRadius-5',
      'getSmoothStepPath/oppositeHorizontal-borderRadius-1000',
      'getSmoothStepPath/oppositeHorizontal-borderRadius--5',
      'getSmoothStepPath/oppositeHorizontal-offset-0',
      'getSmoothStepPath/oppositeHorizontal-offset-20',
      'getSmoothStepPath/oppositeHorizontal-offset-35',
      'getSmoothStepPath/oppositeHorizontal-offset--10',
      'getSmoothStepPath/oppositeHorizontal-stepPosition-0',
      'getSmoothStepPath/oppositeHorizontal-stepPosition-0.25',
      'getSmoothStepPath/oppositeHorizontal-stepPosition-0.5',
      'getSmoothStepPath/oppositeHorizontal-stepPosition-1',
      'getSmoothStepPath/oppositeHorizontal-stepPosition--0.5',
      'getSmoothStepPath/oppositeHorizontal-stepPosition-1.5',
      'getSmoothStepPath/oppositeHorizontal-centerX-0',
      'getSmoothStepPath/oppositeHorizontal-centerX-23',
      'getSmoothStepPath/oppositeHorizontal-centerY-0',
      'getSmoothStepPath/oppositeHorizontal-centerY-37',
      'getSmoothStepPath/oppositeHorizontal-centers-0',
      'getSmoothStepPath/oppositeHorizontal-centers-33',
      'getSmoothStepPath/oppositeVertical-default',
      'getSmoothStepPath/oppositeVertical-borderRadius-0',
      'getSmoothStepPath/oppositeVertical-borderRadius-5',
      'getSmoothStepPath/oppositeVertical-borderRadius-1000',
      'getSmoothStepPath/oppositeVertical-borderRadius--5',
      'getSmoothStepPath/oppositeVertical-offset-0',
      'getSmoothStepPath/oppositeVertical-offset-20',
      'getSmoothStepPath/oppositeVertical-offset-35',
      'getSmoothStepPath/oppositeVertical-offset--10',
      'getSmoothStepPath/oppositeVertical-stepPosition-0',
      'getSmoothStepPath/oppositeVertical-stepPosition-0.25',
      'getSmoothStepPath/oppositeVertical-stepPosition-0.5',
      'getSmoothStepPath/oppositeVertical-stepPosition-1',
      'getSmoothStepPath/oppositeVertical-stepPosition--0.5',
      'getSmoothStepPath/oppositeVertical-stepPosition-1.5',
      'getSmoothStepPath/oppositeVertical-centerX-0',
      'getSmoothStepPath/oppositeVertical-centerX-23',
      'getSmoothStepPath/oppositeVertical-centerY-0',
      'getSmoothStepPath/oppositeVertical-centerY-37',
      'getSmoothStepPath/oppositeVertical-centers-0',
      'getSmoothStepPath/oppositeVertical-centers-33',
      'getSmoothStepPath/same-default',
      'getSmoothStepPath/same-borderRadius-0',
      'getSmoothStepPath/same-borderRadius-5',
      'getSmoothStepPath/same-borderRadius-1000',
      'getSmoothStepPath/same-borderRadius--5',
      'getSmoothStepPath/same-offset-0',
      'getSmoothStepPath/same-offset-20',
      'getSmoothStepPath/same-offset-35',
      'getSmoothStepPath/same-offset--10',
      'getSmoothStepPath/same-stepPosition-0',
      'getSmoothStepPath/same-stepPosition-0.25',
      'getSmoothStepPath/same-stepPosition-0.5',
      'getSmoothStepPath/same-stepPosition-1',
      'getSmoothStepPath/same-stepPosition--0.5',
      'getSmoothStepPath/same-stepPosition-1.5',
      'getSmoothStepPath/same-centerX-0',
      'getSmoothStepPath/same-centerX-23',
      'getSmoothStepPath/same-centerY-0',
      'getSmoothStepPath/same-centerY-37',
      'getSmoothStepPath/same-centers-0',
      'getSmoothStepPath/same-centers-33',
      'getSmoothStepPath/orthogonal-default',
      'getSmoothStepPath/orthogonal-borderRadius-0',
      'getSmoothStepPath/orthogonal-borderRadius-5',
      'getSmoothStepPath/orthogonal-borderRadius-1000',
      'getSmoothStepPath/orthogonal-borderRadius--5',
      'getSmoothStepPath/orthogonal-offset-0',
      'getSmoothStepPath/orthogonal-offset-20',
      'getSmoothStepPath/orthogonal-offset-35',
      'getSmoothStepPath/orthogonal-offset--10',
      'getSmoothStepPath/orthogonal-stepPosition-0',
      'getSmoothStepPath/orthogonal-stepPosition-0.25',
      'getSmoothStepPath/orthogonal-stepPosition-0.5',
      'getSmoothStepPath/orthogonal-stepPosition-1',
      'getSmoothStepPath/orthogonal-stepPosition--0.5',
      'getSmoothStepPath/orthogonal-stepPosition-1.5',
      'getSmoothStepPath/orthogonal-centerX-0',
      'getSmoothStepPath/orthogonal-centerX-23',
      'getSmoothStepPath/orthogonal-centerY-0',
      'getSmoothStepPath/orthogonal-centerY-37',
      'getSmoothStepPath/orthogonal-centers-0',
      'getSmoothStepPath/orthogonal-centers-33',
      'getSmoothStepPath/tie-default',
      'getSmoothStepPath/tie-borderRadius-0',
      'getSmoothStepPath/tie-borderRadius-5',
      'getSmoothStepPath/tie-borderRadius-1000',
      'getSmoothStepPath/tie-borderRadius--5',
      'getSmoothStepPath/tie-offset-0',
      'getSmoothStepPath/tie-offset-20',
      'getSmoothStepPath/tie-offset-35',
      'getSmoothStepPath/tie-offset--10',
      'getSmoothStepPath/tie-stepPosition-0',
      'getSmoothStepPath/tie-stepPosition-0.25',
      'getSmoothStepPath/tie-stepPosition-0.5',
      'getSmoothStepPath/tie-stepPosition-1',
      'getSmoothStepPath/tie-stepPosition--0.5',
      'getSmoothStepPath/tie-stepPosition-1.5',
      'getSmoothStepPath/tie-centerX-0',
      'getSmoothStepPath/tie-centerX-23',
      'getSmoothStepPath/tie-centerY-0',
      'getSmoothStepPath/tie-centerY-37',
      'getSmoothStepPath/tie-centers-0',
      'getSmoothStepPath/tie-centers-33',
      'getSmoothStepPath/collapsed-default',
      'getSmoothStepPath/collapsed-borderRadius-0',
      'getSmoothStepPath/collapsed-borderRadius-5',
      'getSmoothStepPath/collapsed-borderRadius-1000',
      'getSmoothStepPath/collapsed-borderRadius--5',
      'getSmoothStepPath/collapsed-offset-0',
      'getSmoothStepPath/collapsed-offset-20',
      'getSmoothStepPath/collapsed-offset-35',
      'getSmoothStepPath/collapsed-offset--10',
      'getSmoothStepPath/collapsed-stepPosition-0',
      'getSmoothStepPath/collapsed-stepPosition-0.25',
      'getSmoothStepPath/collapsed-stepPosition-0.5',
      'getSmoothStepPath/collapsed-stepPosition-1',
      'getSmoothStepPath/collapsed-stepPosition--0.5',
      'getSmoothStepPath/collapsed-stepPosition-1.5',
      'getSmoothStepPath/collapsed-centerX-0',
      'getSmoothStepPath/collapsed-centerX-23',
      'getSmoothStepPath/collapsed-centerY-0',
      'getSmoothStepPath/collapsed-centerY-37',
      'getSmoothStepPath/collapsed-centers-0',
      'getSmoothStepPath/collapsed-centers-33',
      'getSmoothStepPath/BUG-088-01-left-source-NaN',
      'getSmoothStepPath/BUG-088-01-left-target-NaN',
      'getSmoothStepPath/BUG-088-01-left-offset-NaN',
      'getSmoothStepPath/BUG-088-01-left-finite-gap-10',
      'getSmoothStepPath/BUG-088-01-left-finite-gap-20',
      'getSmoothStepPath/BUG-088-01-left-finite-gap-30',
      'getSmoothStepPath/BUG-088-01-right-source-NaN',
      'getSmoothStepPath/BUG-088-01-right-target-NaN',
      'getSmoothStepPath/BUG-088-01-right-offset-NaN',
      'getSmoothStepPath/BUG-088-01-right-finite-gap-10',
      'getSmoothStepPath/BUG-088-01-right-finite-gap-20',
      'getSmoothStepPath/BUG-088-01-right-finite-gap-30',
      'getSmoothStepPath/BUG-088-01-top-source-NaN',
      'getSmoothStepPath/BUG-088-01-top-target-NaN',
      'getSmoothStepPath/BUG-088-01-top-offset-NaN',
      'getSmoothStepPath/BUG-088-01-top-finite-gap-10',
      'getSmoothStepPath/BUG-088-01-top-finite-gap-20',
      'getSmoothStepPath/BUG-088-01-top-finite-gap-30',
      'getSmoothStepPath/BUG-088-01-bottom-source-NaN',
      'getSmoothStepPath/BUG-088-01-bottom-target-NaN',
      'getSmoothStepPath/BUG-088-01-bottom-offset-NaN',
      'getSmoothStepPath/BUG-088-01-bottom-finite-gap-10',
      'getSmoothStepPath/BUG-088-01-bottom-finite-gap-20',
      'getSmoothStepPath/BUG-088-01-bottom-finite-gap-30',
      'getSmoothStepPath/borderRadius-own-undefined',
      'getSmoothStepPath/borderRadius-NaN',
      'getSmoothStepPath/borderRadius-plusInfinity',
      'getSmoothStepPath/borderRadius-minusInfinity',
      'getSmoothStepPath/borderRadius-large',
      'getSmoothStepPath/offset-own-undefined',
      'getSmoothStepPath/offset-NaN',
      'getSmoothStepPath/offset-plusInfinity',
      'getSmoothStepPath/offset-minusInfinity',
      'getSmoothStepPath/offset-large',
      'getSmoothStepPath/stepPosition-own-undefined',
      'getSmoothStepPath/stepPosition-NaN',
      'getSmoothStepPath/stepPosition-plusInfinity',
      'getSmoothStepPath/stepPosition-minusInfinity',
      'getSmoothStepPath/stepPosition-large',
      'getSmoothStepPath/centerX-own-undefined',
      'getSmoothStepPath/centerX-NaN',
      'getSmoothStepPath/centerX-plusInfinity',
      'getSmoothStepPath/centerX-minusInfinity',
      'getSmoothStepPath/centerX-large',
      'getSmoothStepPath/centerY-own-undefined',
      'getSmoothStepPath/centerY-NaN',
      'getSmoothStepPath/centerY-plusInfinity',
      'getSmoothStepPath/centerY-minusInfinity',
      'getSmoothStepPath/centerY-large',
      'getSmoothStepPath/alias-step',
      'getSmoothStepPath/alias-smoothstep',
    ]) {
      const record = fixture.cases.find(
        ({ descriptor }) => descriptor.id === id
      )

      if (record === undefined) {
        throw new Error(`Missing captured member case ${id}`)
      }

      expect(
        observe(helpers[record.descriptor.helper], record.descriptor)
      ).toStrictEqual(record.outcome)
    }
  })

  it('get-straight-path::0sourcex pinned full-tuple boundary', () => {
    for (const id of [
      'getStraightPath/forward',
      'getStraightPath/perturb-sourceX',
      'getStraightPath/sourceX-NaN',
      'getStraightPath/sourceX-plusInfinity',
      'getStraightPath/sourceX-minusInfinity',
      'getStraightPath/sourceX-negativeZero',
      'getStraightPath/sourceX-large',
    ]) {
      const record = fixture.cases.find(
        ({ descriptor }) => descriptor.id === id
      )

      if (record === undefined) {
        throw new Error(`Missing captured member case ${id}`)
      }

      expect(
        observe(helpers[record.descriptor.helper], record.descriptor)
      ).toStrictEqual(record.outcome)
    }
  })

  it('get-straight-path::0sourcey pinned full-tuple boundary', () => {
    for (const id of [
      'getStraightPath/forward',
      'getStraightPath/perturb-sourceY',
      'getStraightPath/sourceY-NaN',
      'getStraightPath/sourceY-plusInfinity',
      'getStraightPath/sourceY-minusInfinity',
      'getStraightPath/sourceY-negativeZero',
      'getStraightPath/sourceY-large',
    ]) {
      const record = fixture.cases.find(
        ({ descriptor }) => descriptor.id === id
      )

      if (record === undefined) {
        throw new Error(`Missing captured member case ${id}`)
      }

      expect(
        observe(helpers[record.descriptor.helper], record.descriptor)
      ).toStrictEqual(record.outcome)
    }
  })

  it('get-straight-path::0targetx pinned full-tuple boundary', () => {
    for (const id of [
      'getStraightPath/forward',
      'getStraightPath/perturb-targetX',
      'getStraightPath/targetX-NaN',
      'getStraightPath/targetX-plusInfinity',
      'getStraightPath/targetX-minusInfinity',
      'getStraightPath/targetX-negativeZero',
      'getStraightPath/targetX-large',
    ]) {
      const record = fixture.cases.find(
        ({ descriptor }) => descriptor.id === id
      )

      if (record === undefined) {
        throw new Error(`Missing captured member case ${id}`)
      }

      expect(
        observe(helpers[record.descriptor.helper], record.descriptor)
      ).toStrictEqual(record.outcome)
    }
  })

  it('get-straight-path::0targety pinned full-tuple boundary', () => {
    for (const id of [
      'getStraightPath/forward',
      'getStraightPath/perturb-targetY',
      'getStraightPath/targetY-NaN',
      'getStraightPath/targetY-plusInfinity',
      'getStraightPath/targetY-minusInfinity',
      'getStraightPath/targetY-negativeZero',
      'getStraightPath/targetY-large',
    ]) {
      const record = fixture.cases.find(
        ({ descriptor }) => descriptor.id === id
      )

      if (record === undefined) {
        throw new Error(`Missing captured member case ${id}`)
      }

      expect(
        observe(helpers[record.descriptor.helper], record.descriptor)
      ).toStrictEqual(record.outcome)
    }
  })

  it('get-straight-path::getStraightPath pinned full-tuple boundary', () => {
    for (const id of [
      'getStraightPath/forward',
      'getStraightPath/reverse',
      'getStraightPath/coincident',
      'getStraightPath/horizontal',
      'getStraightPath/vertical',
      'getStraightPath/zero',
      'getStraightPath/perturb-sourceX',
      'getStraightPath/perturb-sourceY',
      'getStraightPath/perturb-targetX',
      'getStraightPath/perturb-targetY',
      'getStraightPath/sourceX-NaN',
      'getStraightPath/sourceX-plusInfinity',
      'getStraightPath/sourceX-minusInfinity',
      'getStraightPath/sourceX-negativeZero',
      'getStraightPath/sourceX-large',
      'getStraightPath/sourceY-NaN',
      'getStraightPath/sourceY-plusInfinity',
      'getStraightPath/sourceY-minusInfinity',
      'getStraightPath/sourceY-negativeZero',
      'getStraightPath/sourceY-large',
      'getStraightPath/targetX-NaN',
      'getStraightPath/targetX-plusInfinity',
      'getStraightPath/targetX-minusInfinity',
      'getStraightPath/targetX-negativeZero',
      'getStraightPath/targetX-large',
      'getStraightPath/targetY-NaN',
      'getStraightPath/targetY-plusInfinity',
      'getStraightPath/targetY-minusInfinity',
      'getStraightPath/targetY-negativeZero',
      'getStraightPath/targetY-large',
      'getStraightPath/alias-straight',
    ]) {
      const record = fixture.cases.find(
        ({ descriptor }) => descriptor.id === id
      )

      if (record === undefined) {
        throw new Error(`Missing captured member case ${id}`)
      }

      expect(
        observe(helpers[record.descriptor.helper], record.descriptor)
      ).toStrictEqual(record.outcome)
    }
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
