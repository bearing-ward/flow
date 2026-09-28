import { readFileSync } from 'node:fs'

const readJson = (path) => JSON.parse(readFileSync(path, 'utf-8'))

const allocation = readJson('plans/next-chunks-coverage.json')

const baseline = readJson(allocation.baseline)

const fail = (message) => {
  throw new Error(message)
}

const expectedPlans = Array.from({ length: 10 }, (_, index) =>
  String(index + 53).padStart(3, '0')
)

const planIds = allocation.plans.map(({ id }) => id)

if (JSON.stringify(planIds) !== JSON.stringify(expectedPlans)) {
  fail('Expected exactly Plans 053-062 in order')
}

const indexText = readFileSync('plans/README.md', 'utf-8')

for (const plan of allocation.plans) {
  const text = readFileSync(plan.file, 'utf-8')

  for (const section of [
    '## Status',
    '## Why this matters',
    '## Current state and exemplars',
    '## Architecture and evidence rules',
    '## Commands and execution discipline',
    '## Scope',
    '## Ordered work packages',
    '## Plan-specific done criteria',
    '## Plan-specific STOP conditions',
    '## Maintenance and follow-up',
    '## Common completion gate',
  ]) {
    if (!text.includes(section)) {
      fail(`${plan.id}: missing ${section}`)
    }
  }

  if (!text.includes('f8b73f2')) {
    fail(`${plan.id}: missing baseline SHA`)
  }

  if (!text.includes('bun run verify')) {
    fail(`${plan.id}: missing full gate`)
  }

  const file = plan.file.replace(/^plans\//u, '')

  if (!indexText.includes(`](${file})`)) {
    fail(`${plan.id}: missing index row`)
  }

  const steps = text.split(/^### \d+\./mu).slice(1)

  if (steps.length < 4 || steps.some((step) => !step.includes('**Verify:**'))) {
    fail(`${plan.id}: each work package needs a verification command`)
  }
}

const expected = new Map(baseline.entries.map((entry) => [entry.url, entry]))

const seen = new Set()

let capabilities = 0

let navigation = 0

const counts = {}

for (const entry of allocation.entries) {
  if (seen.has(entry.url)) {
    fail(`Duplicate URL: ${entry.url}`)
  }

  seen.add(entry.url)
  const original = expected.get(entry.url)

  if (!original) {
    fail(`Unknown URL: ${entry.url}`)
  }

  for (const key of ['section', 'kind', 'title', 'listedPro']) {
    if (entry[key] !== original[key]) {
      fail(`${entry.url}: changed ${key}`)
    }
  }

  if (entry.kind === 'navigation') {
    navigation += 1

    if (entry.ownerPlan !== 'inventory' || entry.status !== 'navigation') {
      fail(`${entry.url}: navigation must not count as capability work`)
    }

    continue
  }

  capabilities += 1
  counts[entry.ownerPlan] = (counts[entry.ownerPlan] ?? 0) + 1

  if (!planIds.includes(entry.ownerPlan)) {
    fail(`${entry.url}: missing owner`)
  }

  if (entry.status !== 'planned') {
    fail(`${entry.url}: unsupported proof claim`)
  }

  if (
    JSON.stringify(entry.requiredHosts) !==
    JSON.stringify(['vanilla', 'vue', 'foldkit'])
  ) {
    fail(`${entry.url}: all three hosts are required`)
  }

  if (
    JSON.stringify(entry.deliveryPlans) !==
    JSON.stringify(['060', '061', '062'])
  ) {
    fail(`${entry.url}: missing proof/package/release gates`)
  }

  for (const plan of entry.relatedPlans) {
    if (!planIds.includes(plan)) {
      fail(`${entry.url}: unknown related plan ${plan}`)
    }
  }
}

for (const url of expected.keys()) {
  if (!seen.has(url)) {
    fail(`Unplanned catalog URL: ${url}`)
  }
}

if (capabilities !== 200 || navigation !== 8) {
  fail(
    `Baseline counts changed: ${capabilities} capabilities, ${navigation} navigation`
  )
}

console.info(
  JSON.stringify({
    plans: planIds.length,
    capabilities,
    navigation,
    owners: counts,
  })
)
