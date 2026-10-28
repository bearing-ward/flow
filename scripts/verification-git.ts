import { spawnSync } from 'node:child_process'

import { Effect } from 'effect'

const git = (root: string, args: readonly string[]) =>
  Effect.try(() => {
    const result = spawnSync('git', [...args], {
      cwd: root,
      encoding: 'utf-8',
    })

    if (result.status !== 0) {
      throw new Error(
        `git ${args.join(' ')} failed: ${result.error?.message ?? result.stderr}`
      )
    }

    return result.stdout
  })

export const changedBrowserPaths = (root: string) =>
  Effect.gen(function* resolveChangedBrowserPaths() {
    const base = (yield* git(root, ['merge-base', 'HEAD', 'main'])).trim()

    const tracked = yield* git(root, [
      'diff',
      '--name-only',
      '--diff-filter=ACMRTUXB',
      '-z',
      base,
      '--',
      'apps',
    ])

    const untracked = yield* git(root, [
      'ls-files',
      '--others',
      '--exclude-standard',
      '-z',
      '--',
      'apps',
    ])

    return [
      ...new Set(
        [...tracked.split('\0'), ...untracked.split('\0')].filter(Boolean)
      ),
    ].toSorted()
  })
