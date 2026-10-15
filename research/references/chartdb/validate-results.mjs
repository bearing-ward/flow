import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'

const file = (name) => new URL(`results/${name}`, import.meta.url)
const json = async (name) => JSON.parse(await readFile(file(name), 'utf8'))
const run = await json('run.json')
const summary = await json('summary.json')
assert.equal(summary.run, run.capturedAt)
assert.equal(summary.scenarios.length, 16)
assert.deepEqual(summary.errors, [])
for (let n = 1; n <= 16; n++) {
  const id = `S${n}`
  const scenario = await json(`${id}.json`)
  assert.equal(scenario.run, run.capturedAt, `${id} belongs to another run`)
  assert.equal(scenario.status, 'observed', `${id} was not observed`)
  assert.equal(scenario.id, id)
  for (const state of [scenario.before, scenario.after]) {
    assert.ok(Number.isFinite(state.viewport.zoom))
    assert.ok(state.viewport.zoom >= 0.1 && state.viewport.zoom <= 5)
    for (const edge of state.edges) {
      assert.ok(['left', 'right', 'top', 'bottom'].includes(edge.sourceSide))
      assert.ok(['left', 'right', 'top', 'bottom'].includes(edge.targetSide))
      assert.ok(['none', 'circle-text'].includes(edge.markerStartType.kind))
      assert.ok(['none', 'circle-text'].includes(edge.markerEndType.kind))
    }
  }
  const screenshots = []
  for (const theme of ['light', 'dark']) {
    const png = await readFile(file(`screenshots/${id}-${theme}.png`))
    assert.equal(png.subarray(1, 4).toString(), 'PNG')
    assert.equal(png.readUInt32BE(16), run.viewport.width)
    assert.equal(png.readUInt32BE(20), run.viewport.height)
    screenshots.push(createHash('sha256').update(png).digest('hex'))
  }
  assert.notEqual(
    screenshots[0],
    screenshots[1],
    `${id} screenshot pair is identical`
  )
}
const exported = await readFile(file('export.png'))
const s16 = await json('S16.json')
assert.equal(exported.readUInt32BE(16), s16.outcome.image.width)
assert.equal(exported.readUInt32BE(20), s16.outcome.image.height)
assert.equal(exported.length, s16.outcome.image.byteLength)
const sources = await json('sources.json')
for (const source of sources.files) {
  const bytes = await readFile(`${sources.checkout}/${source.path}`)
  assert.equal(
    createHash('sha256').update(bytes).digest('hex'),
    source.sha256,
    `Source changed: ${source.path}`
  )
}
console.log(
  'Validated all 16 scenario records, 32 screenshots, PNG download, and cited source hashes.'
)

const report = JSON.parse(
  await readFile('/tmp/chartdb-ref/playwright-report.json', 'utf8')
)
assert.equal(report.stats.unexpected, 0)
assert.equal(report.stats.expected, 1)
assert.ok(
  Date.parse(report.stats.startTime) + report.stats.duration >=
    Date.parse(run.capturedAt)
)
await writeFile(
  file('capture-receipt.json'),
  `${JSON.stringify(
    {
      run: run.capturedAt,
      playwright: report.stats,
      validation: {
        scenarios: 16,
        pairedScreenshots: 32,
        pngDownload: true,
        sourceHashes: sources.files.length,
        explicitEndpointSides: true,
      },
    },
    null,
    2
  )}\n`
)
