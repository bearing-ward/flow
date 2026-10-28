import type { FlowChange } from '@flow/core'
import type { Page } from '@playwright/test'

import type * as UpstreamFixture from '../src/upstream-fixture.ts'

export const upstreamChange = (page: Page, kind: FlowChange['kind']) =>
  page.evaluate(async (changeKind) => {
    const path = '/src/upstream-fixture.ts'
    const fixture: typeof UpstreamFixture = await import(path)

    return fixture.upstreamChanges.findLast(
      (change) => change.kind === changeKind
    )
  }, kind)
