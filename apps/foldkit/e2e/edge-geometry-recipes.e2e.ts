import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { Schema as S } from 'effect'

/*
 * The public edge-geometry query must describe what the host draws: compare
 * getEdgesGeometry's path with each rendered edge path `d` for every
 * built-in path kind, after normalising number formatting.
 */

const GeometrySchema = S.Array(S.Struct({ id: S.String, path: S.String }))

const pathKinds = ['bezier', 'step', 'smoothstep', 'simplebezier', 'straight']

/** Commands and numbers rounded to hundredths, ignoring separators. */
const normalise = (path: string): string =>
  (path.match(/[A-Za-z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gu) ?? [])
    .map((token) =>
      /^[A-Za-z]$/u.test(token)
        ? token
        : String(Math.round(Number(token) * 100) / 100)
    )
    .join(' ')

const renderedPath = (page: Page, edgeId: string) =>
  page.evaluate(
    (id) =>
      globalThis.document
        .querySelector(
          `[data-testid="flow-edge"][data-edge-id="${id}"] .flow-foldkit-edge-path`
        )
        ?.getAttribute('d') ?? null,
    edgeId
  )

test('edge geometry: core paths match every rendered built-in path kind', async ({
  page,
}) => {
  await page.goto('/ui-recipes/intersections/?scene=edge-paths')
  const status = page.getByTestId('recipe-status')

  await expect
    .poll(async () => {
      const raw = await status.getAttribute('data-geometry')

      const geometry = S.decodeUnknownSync(GeometrySchema)(
        JSON.parse(raw ?? '[]')
      )

      const compared = await Promise.all(
        geometry.map(async ({ id, path }) => {
          const rendered = await renderedPath(page, id)

          return {
            id,
            matches:
              rendered !== null && normalise(rendered) === normalise(path),
          }
        })
      )

      return compared
    })
    .toStrictEqual(pathKinds.map((id) => ({ id, matches: true })))

  // The kinds really differ: cubic curves, rounded corners, a straight line.
  await expect.poll(() => renderedPath(page, 'bezier')).toMatch(/C/u)
  await expect.poll(() => renderedPath(page, 'smoothstep')).toMatch(/Q/u)
  await expect.poll(() => renderedPath(page, 'straight')).not.toMatch(/[CQ]/u)
})
