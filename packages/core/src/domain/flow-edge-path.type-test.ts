import type {
  getBezierPath,
  getSimpleBezierPath,
  getSmoothStepPath,
} from './flow-edge-path.ts'

// Checked by the root tsc invocation; never registered as a runtime test.
const exactOptionalArguments = () => {
  const coordinates = { sourceX: 0, sourceY: 0, targetX: 100, targetY: 100 }

  // @ts-expect-error Root exactOptionalPropertyTypes forbids own-undefined sourcePosition.
  const invalid0: Parameters<typeof getBezierPath>[0] = {
    ...coordinates,
    sourcePosition: undefined,
  }

  // @ts-expect-error Root exactOptionalPropertyTypes forbids own-undefined targetPosition.
  const invalid1: Parameters<typeof getBezierPath>[0] = {
    ...coordinates,
    targetPosition: undefined,
  }

  // @ts-expect-error Root exactOptionalPropertyTypes forbids own-undefined curvature.
  const invalid2: Parameters<typeof getBezierPath>[0] = {
    ...coordinates,
    curvature: undefined,
  }

  // @ts-expect-error Root exactOptionalPropertyTypes forbids own-undefined sourcePosition.
  const invalid3: Parameters<typeof getSimpleBezierPath>[0] = {
    ...coordinates,
    sourcePosition: undefined,
  }

  // @ts-expect-error Root exactOptionalPropertyTypes forbids own-undefined targetPosition.
  const invalid4: Parameters<typeof getSimpleBezierPath>[0] = {
    ...coordinates,
    targetPosition: undefined,
  }

  // @ts-expect-error Root exactOptionalPropertyTypes forbids own-undefined sourcePosition.
  const invalid5: Parameters<typeof getSmoothStepPath>[0] = {
    ...coordinates,
    sourcePosition: undefined,
  }

  // @ts-expect-error Root exactOptionalPropertyTypes forbids own-undefined targetPosition.
  const invalid6: Parameters<typeof getSmoothStepPath>[0] = {
    ...coordinates,
    targetPosition: undefined,
  }

  // @ts-expect-error Root exactOptionalPropertyTypes forbids own-undefined borderRadius.
  const invalid7: Parameters<typeof getSmoothStepPath>[0] = {
    ...coordinates,
    borderRadius: undefined,
  }

  // @ts-expect-error Root exactOptionalPropertyTypes forbids own-undefined centerX.
  const invalid8: Parameters<typeof getSmoothStepPath>[0] = {
    ...coordinates,
    centerX: undefined,
  }

  // @ts-expect-error Root exactOptionalPropertyTypes forbids own-undefined centerY.
  const invalid9: Parameters<typeof getSmoothStepPath>[0] = {
    ...coordinates,
    centerY: undefined,
  }

  // @ts-expect-error Root exactOptionalPropertyTypes forbids own-undefined offset.
  const invalid10: Parameters<typeof getSmoothStepPath>[0] = {
    ...coordinates,
    offset: undefined,
  }

  // @ts-expect-error Root exactOptionalPropertyTypes forbids own-undefined stepPosition.
  const invalid11: Parameters<typeof getSmoothStepPath>[0] = {
    ...coordinates,
    stepPosition: undefined,
  }

  return [
    invalid0,
    invalid1,
    invalid2,
    invalid3,
    invalid4,
    invalid5,
    invalid6,
    invalid7,
    invalid8,
    invalid9,
    invalid10,
    invalid11,
  ]
}

void exactOptionalArguments
