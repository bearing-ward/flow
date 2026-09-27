import { BunRuntime, BunServices } from '@effect/platform-bun'
import { Effect, FileSystem, Path, Schema as S } from 'effect'

const Section = S.Literals(['api-reference', 'examples', 'ui'])

const Entry = S.Struct({
  section: Section,
  kind: S.Literals(['navigation', 'capability']),
  url: S.NonEmptyString,
  title: S.NonEmptyString,
  listedPro: S.Boolean,
})

const Catalog = S.Struct({
  capturedOn: S.NonEmptyString,
  flowCommit: S.NonEmptyString,
  scope: S.NonEmptyString,
  sources: S.Array(
    S.Struct({ url: S.NonEmptyString, sha256: S.NonEmptyString })
  ),
  entries: S.Array(Entry),
})

const origin = 'https://reactflow.dev'

const snapshot = 'research/catalogs/react-flow-2026-09-26.json'

const document = 'research/catalogs/react-flow-coverage.md'

const rowPattern =
  /^\|\s*\[[^\]]+\]\(\s*(?<url>https:\/\/reactflow\.dev\/[^)\s]+)\s*\)\s*\|/u

const checkRow = (
  line: string,
  entry: typeof Entry.Type | undefined,
  url: string
): readonly string[] => {
  const failures: string[] = []

  const cells = line
    .split('|')
    .slice(1, -1)
    .map((cell) => cell.trim())

  if (cells.length !== 7) {
    failures.push(`Expected seven columns: ${url}`)
  }

  const statuses = cells.slice(2, 5)
  const allowed = entry?.kind === 'navigation' ? ['N'] : ['P', 'G']

  if (
    statuses.length !== 3 ||
    statuses.some((status) => !allowed.includes(status))
  ) {
    failures.push(`Missing or invalid framework status: ${url}`)
  }

  if (cells[5] !== (entry?.kind === 'navigation' ? 'N' : 'U')) {
    failures.push(
      `Baseline reference status must be U, or N for navigation: ${url}`
    )
  }

  if (!cells[1]?.includes('](#') || !cells[6]) {
    failures.push(`Missing mapping/evidence link or remaining work: ${url}`)
  }

  if (entry?.listedPro && !cells[0]?.includes(' · Pro]')) {
    failures.push(`Missing Pro label: ${url}`)
  }

  return failures
}

export const checkCoverage = (
  entries: readonly (typeof Entry.Type)[],
  markdown: string
): readonly string[] => {
  const failures: string[] = []
  const expected = new Map(entries.map((entry) => [entry.url, entry]))
  const seen = new Set<string>()

  if (expected.size !== entries.length) {
    failures.push('Duplicate snapshot URL')
  }

  for (const line of markdown.split('\n')) {
    const url = line.match(rowPattern)?.groups?.url

    if (url === undefined) {
      continue
    }

    const entry = expected.get(url)

    if (entry === undefined) {
      failures.push(`Unknown row: ${url}`)
    }

    if (seen.has(url)) {
      failures.push(`Duplicate row: ${url}`)
    }

    seen.add(url)

    failures.push(...checkRow(line, entry, url))
  }

  for (const url of expected.keys()) {
    if (!seen.has(url)) {
      failures.push(`Missing row: ${url}`)
    }
  }

  return failures
}

const decodeLabel = (label: string): string =>
  label
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#x27;', "'")
    .replaceAll(/\s+/gu, ' ')
    .trim()

const readLinks = async (url: string, selector: string) => {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) })

  if (!response.ok) {
    throw new Error(`${url}: HTTP ${response.status}`)
  }

  const links: { url: string; title: string }[] = []
  let active: { url: string; title: string } | undefined
  await new HTMLRewriter()
    .on(selector, {
      element(element) {
        const href = element.getAttribute('href')

        if (href === null) {
          return
        }

        active = { url: new URL(href, url).href, title: '' }
        links.push(active)
        element.onEndTag(() => {
          active = undefined
        })
      },
      text(chunk) {
        if (active !== undefined) {
          active.title += chunk.text
        }
      },
    })
    .transform(response)
    .text()

  return links.map((link) => ({ ...link, title: decodeLabel(link.title) }))
}

const checkEvidenceLinks = (
  root: string,
  markdown: string,
  failures: string[]
) =>
  Effect.gen(function* checkEvidenceLinksEffect() {
    const fileSystem = yield* FileSystem.FileSystem
    const path = yield* Path.Path

    const headings = new Set(
      [...markdown.matchAll(/^#{1,6} (?<heading>.+)$/gmu)].map((match) =>
        (match.groups?.heading ?? '')
          .toLowerCase()
          .replaceAll(/[^a-z0-9 -]/gu, '')
          .replaceAll(' ', '-')
      )
    )

    for (const match of markdown.matchAll(/\]\((?<target>[^)]+)\)/gu)) {
      const target = match.groups?.target ?? ''

      if (target.startsWith('https://')) {
        continue
      }

      if (target.startsWith('#')) {
        if (!headings.has(target.slice(1))) {
          failures.push(`Missing heading: ${target}`)
        }

        continue
      }

      const [file = '', anchor] = target.split('#')
      const resolved = path.resolve(root, 'research/catalogs', file)

      if (!(yield* fileSystem.exists(resolved))) {
        failures.push(`Missing local evidence: ${target}`)
        continue
      }

      if (anchor?.startsWith('L')) {
        const line = Number(anchor.slice(1))

        const lines = (yield* fileSystem.readFileString(resolved)).split(
          '\n'
        ).length

        if (!Number.isInteger(line) || line < 1 || line > lines) {
          failures.push(`Invalid evidence line: ${target}`)
        }
      }
    }
  })

const program = Effect.gen(function* checkReactFlowCatalog() {
  const fileSystem = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  const root = yield* path.fromFileUrl(new URL('..', import.meta.url))

  const catalog = yield* S.decodeUnknownEffect(Catalog)(
    JSON.parse(yield* fileSystem.readFileString(path.join(root, snapshot)))
  )

  const markdown = yield* fileSystem.readFileString(path.join(root, document))
  const failures = [...checkCoverage(catalog.entries, markdown)]

  yield* checkEvidenceLinks(root, markdown, failures)

  if (Bun.argv.includes('--upstream')) {
    for (const section of ['api-reference', 'examples', 'ui']) {
      const url = `${origin}/${section}`

      const links = yield* Effect.tryPromise(() =>
        readLinks(url, 'aside.nextra-sidebar a')
      )

      const actual = new Map(
        links
          .filter((link) => link.url === url || link.url.startsWith(`${url}/`))
          .map((link) => [link.url, link.title])
      )

      const expected = catalog.entries.filter(
        (entry) => entry.section === section
      )

      if (actual.size === 0) {
        failures.push(`Empty sidebar; inspect markup: ${url}`)
      }

      for (const entry of expected) {
        if (actual.get(entry.url) !== entry.title) {
          failures.push(`Upstream removed or renamed: ${entry.url}`)
        }

        actual.delete(entry.url)
      }

      for (const added of actual.keys()) {
        failures.push(`Upstream added: ${added}`)
      }
    }

    const proLinks = yield* Effect.tryPromise(() =>
      readLinks(`${origin}/examples/pro-examples`, 'article a')
    )

    const actualPro = new Set(
      proLinks
        .map((link) => link.url)
        .filter(
          (url) =>
            url.startsWith(`${origin}/examples/`) &&
            url !== `${origin}/examples/overview`
        )
    )

    const expectedPro = new Set(
      catalog.entries
        .filter((entry) => entry.listedPro)
        .map((entry) => entry.url)
    )

    for (const url of actualPro) {
      if (!expectedPro.has(url)) {
        failures.push(`Pro listing added: ${url}`)
      }
    }

    for (const url of expectedPro) {
      if (!actualPro.has(url)) {
        failures.push(`Pro listing removed: ${url}`)
      }
    }
  }

  if (failures.length > 0) {
    return yield* Effect.fail(new Error(failures.join('\n')))
  }

  yield* Effect.log('React Flow catalog coverage checked', {
    capturedOn: catalog.capturedOn,
    entries: catalog.entries.length,
    capabilities: catalog.entries.filter((entry) => entry.kind === 'capability')
      .length,
    upstreamChecked: Bun.argv.includes('--upstream'),
  })
})

if (import.meta.main) {
  BunRuntime.runMain(program.pipe(Effect.provide(BunServices.layer)))
}
