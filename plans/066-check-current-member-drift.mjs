// bun plans/066-check-current-member-drift.mjs
// Current-site identity drift only. Never updates the dated or pinned inventory.
import { Effect, Schema as S } from 'effect'

import { ApiMemberCatalogSchema } from '../scripts/check-api-members.ts'

const root = new URL('../', import.meta.url)

const catalog = S.decodeUnknownSync(ApiMemberCatalogSchema)(
  await Bun.file(new URL('research/catalogs/api-members.json', root)).json()
)

const pages = await Effect.runPromise(
  Effect.forEach(
    catalog.pages,
    (page) =>
      Effect.promise(async () => {
        try {
          const response = await fetch(page.url, {
            signal: AbortSignal.timeout(30_000),
          })

          if (!response.ok) {
            return {
              url: page.url,
              status: 'unverified',
              httpStatus: response.status,
            }
          }

          const html = await response.text()

          const currentAnchors = new Set(
            [...html.matchAll(/id="(?<id>[a-z0-9_][a-z0-9_-]*)"/gu)].map(
              (match) => `#${match.groups.id}`
            )
          )

          const missingDatedAnchors = page.upstreamAnchors.filter(
            (anchor) => !currentAnchors.has(anchor)
          )

          const hash = new Bun.CryptoHasher('sha256').update(html).digest('hex')

          return {
            url: page.url,
            status:
              missingDatedAnchors.length === 0
                ? 'dated-anchors-retained'
                : 'current-site-anchor-drift',
            httpStatus: response.status,
            sha256: hash,
            datedAnchors: page.upstreamAnchors.length,
            retainedDatedAnchors:
              page.upstreamAnchors.length - missingDatedAnchors.length,
            missingDatedAnchors,
            limitation:
              'Anchor identities only; prose/default/type changes and pinned runtime equivalence remain unverified.',
          }
        } catch (error) {
          return { url: page.url, status: 'unverified', failure: String(error) }
        }
      }),
    { concurrency: 4 }
  )
)

const result = {
  checkedOn: new Date().toISOString(),
  datedCapture: catalog.capturedOn,
  pinnedRevision: catalog.pages[0].pinnedSourceRevision,
  scope:
    'Live official page and dated anchor identity check, separate from original requirements and pinned runtime proof.',
  pages,
}

await Bun.write(
  new URL('plans/066-current-member-drift.json', root),
  `${JSON.stringify(result, null, 2)}\n`
)

const formatter = Bun.spawn(
  [
    'bunx',
    'oxfmt',
    new URL('plans/066-current-member-drift.json', root).pathname,
  ],
  { stdout: 'inherit', stderr: 'inherit' }
)

if ((await formatter.exited) !== 0) {
  throw new Error('Drift record formatting failed')
}

console.log(
  `Checked ${pages.length} official pages; ${pages.filter((page) => page.status === 'current-site-anchor-drift').length} anchor drift pages; ${pages.filter((page) => page.status === 'unverified').length} unverified pages. No inventory changed.`
)
