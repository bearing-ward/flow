const source = new URL('../', import.meta.url).pathname.replace(/\/$/u, '')

const folder = `/tmp/flow-066-generator-${crypto.randomUUID()}`

await Bun.$`mkdir -p ${folder}/plans ${folder}/research/catalogs`

await Bun.$`ln -s ${source}/node_modules ${folder}/node_modules`

await Bun.$`ln -s ${source}/scripts ${folder}/scripts`

await Promise.all(
  [
    'plans/066-decompose-members.mjs',
    'plans/066-member-routing.json',
    'plans/057-member-closure.json',
    'research/catalogs/api-members.json',
  ].map(async (name) =>
    Bun.write(`${folder}/${name}`, await Bun.file(`${source}/${name}`).text())
  )
)

const closure = await Bun.file(`${folder}/plans/057-member-closure.json`).json()

const inventory = await Bun.file(
  `${folder}/research/catalogs/api-members.json`
).json()

const run = async (mode) => {
  const p = Bun.spawn(
    ['bun', `${folder}/plans/066-decompose-members.mjs`, mode],
    { stdout: 'pipe', stderr: 'pipe' }
  )

  return { exit: await p.exited, stderr: await new Response(p.stderr).text() }
}

let result = await run('--check')

if (result.exit !== 0) {
  throw new Error(result.stderr)
}

console.log('PASS original regeneration check')

await Bun.write(
  `${folder}/plans/057-member-closure.json`,
  JSON.stringify({ ...closure, cells: closure.cells.slice(1) })
)

result = await run('--write')

if (result.exit === 0 || !result.stderr.includes('dropped/added')) {
  throw new Error('Dropped cell accepted')
}

console.log('PASS dropped-cell rejection')

await Bun.write(
  `${folder}/plans/057-member-closure.json`,
  JSON.stringify(closure)
)

const changed = structuredClone(inventory)

changed.pages[0].members.push({
  ...changed.pages[0].members[0],
  id: 'new-unmapped-member',
})

await Bun.write(
  `${folder}/research/catalogs/api-members.json`,
  JSON.stringify(changed)
)

result = await run('--write')

if (result.exit === 0 || !result.stderr.includes('Unmapped/new')) {
  throw new Error('New requirement accepted')
}

console.log('PASS new-unmapped-member rejection')

await Bun.write(
  `${folder}/research/catalogs/api-members.json`,
  JSON.stringify(inventory)
)

const withProof = structuredClone(closure)

const [first] = withProof.cells

first.state = 'implemented-with-evidence'

first.proof = {
  page: first.page,
  member: first.member,
  host: first.host,
  assertion: `${first.member} exact proof must survive regeneration`,
  implementation: 'apps/vanilla/src/mount-flow.ts:1',
  productionTest: 'apps/vanilla/e2e/public-state.e2e.ts:1',
  reference: 'packages/conformance/src/member-reference.test.ts:1',
  upstreamMember: `${first.page}#arialabelconfig`,
}

await Bun.write(
  `${folder}/plans/057-member-closure.json`,
  JSON.stringify(withProof)
)

result = await run('--write')

if (result.exit !== 0) {
  throw new Error(result.stderr)
}

const saved = await Bun.file(`${folder}/plans/057-member-closure.json`).json()

if (JSON.stringify(saved.cells[0]) !== JSON.stringify(first)) {
  throw new Error('Proof changed')
}

console.log('PASS complete proof preservation')

await Bun.$`rm -rf ${folder}`
