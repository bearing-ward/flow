import { spawnSync } from 'node:child_process'

/** Validate that a package archive contains only its manifest and built output. */
export const checkPackageArchive = (
  archivePath: string,
  packageName: string
) => {
  const result = spawnSync('tar', ['-tzf', archivePath], {
    encoding: 'utf-8',
  })

  if (result.status !== 0 || result.stdout === null) {
    throw new Error(
      `Could not inspect ${packageName} archive: ${result.stderr ?? result.error?.message ?? ''}`
    )
  }

  const entries = result.stdout
    .split(/\r?\n/u)
    .filter((entry) => entry.length > 0)
    .map((entry) => entry.replace(/^\.\//u, ''))

  const allowedMetadata = new Set([
    'package/',
    'package/package.json',
    'package/README.md',
    'package/LICENSE',
    'package/LICENSE.md',
    'package/COPYING.LIB',
  ])

  const leakedPathSegment =
    /(?<segmentStart>^|\/)(?:src|source|apps|research|tests?|e2e|demo|examples|fixtures|node_modules|\.git)(?:\/|$)/iu

  const unexpected = entries.filter(
    (entry) =>
      (!allowedMetadata.has(entry) && !entry.startsWith('package/dist/')) ||
      leakedPathSegment.test(entry)
  )

  if (unexpected.length > 0) {
    throw new Error(
      `${packageName} archive contains files outside package metadata and dist/: ${unexpected.join(', ')}`
    )
  }

  if (
    !entries.includes('package/package.json') ||
    !entries.some((entry) => entry.startsWith('package/dist/'))
  ) {
    throw new Error(
      `${packageName} archive is missing its manifest or built dist output`
    )
  }
}
