import { readFile } from 'node:fs/promises'

import { describe, expect, it } from 'vitest'

import ledger from '../../research/catalogs/upstream-test-ledger.json' with { type: 'json' }
import { componentFixtureSource } from './fixture-source.ts'

const entries = ledger.cases.filter((entry) => entry.phase === 128)

const extract = async (entry: (typeof entries)[number]) => {
  const [file, line] = entry.upstream.split(':')

  const text = await readFile(
    `research/artifacts/xyflow/${ledger.revision}/${file}`,
    'utf-8'
  )

  return componentFixtureSource(
    text,
    Number(line),
    entry.upstream.includes('/utils/')
  )
}

describe('Pinned React reference fixture extraction', () => {
  it('covers every component and utility declaration and keeps utility assertions', async () => {
    const sources = await Promise.all(entries.map(extract))
    expect(sources).toHaveLength(107)
    expect(sources.filter((text) => text.includes('cy.mount('))).toHaveLength(
      76
    )
    expect(sources.filter((text) => text.includes("from 'chai'"))).toHaveLength(
      31
    )

    for (const source of sources) {
      expect(source).not.toContain('cy.get(')
      expect(source).not.toContain('cy.drag(')
    }
  })

  it('keeps nodeExtent input and nested scrolling fixture declarations', async () => {
    const extent = entries.find((entry) => entry.id === 'UP-128-072')
    const scroll = entries.find((entry) => entry.id === 'UP-128-073')

    if (!extent || !scroll) {
      throw new Error('Missing pinned fixture')
    }

    await expect(extract(extent)).resolves.toContain('nodes: nodes')
    await expect(extract(extent)).resolves.toContain('[50, 50]')
    await expect(extract(scroll)).resolves.toContain('function ScrollFlow')
  })
})
