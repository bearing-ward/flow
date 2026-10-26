import { BunRuntime, BunServices } from '@effect/platform-bun'
import { Effect, FileSystem, Path, Schema as S } from 'effect'

const citationPattern =
  /`(?<path>(?:packages|examples|tests|apps)\/[^`:\n]+):(?<line>\d+)`/gu

export const isFlowTraceSourcePath = (relativePath: string): boolean =>
  relativePath.startsWith('packages/core/') ||
  relativePath.startsWith('packages/layout/') ||
  relativePath.startsWith('packages/image-service/') ||
  relativePath.startsWith('packages/routing-libavoid/') ||
  relativePath.startsWith('tests/routing/') ||
  relativePath.startsWith('packages/conformance/') ||
  relativePath.startsWith('packages/foldkit/') ||
  relativePath.startsWith('packages/vue/') ||
  relativePath.startsWith('apps/') ||
  relativePath.startsWith('tests/consumer/')

const UpstreamSchema = S.Struct({ commit: S.NonEmptyString })

const root = new URL('..', import.meta.url)

const program = Effect.gen(function* program() {
  const fileSystem = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  const rootPath = yield* path.fromFileUrl(root)
  const tracesPath = path.join(rootPath, 'research', 'traces')

  const upstream = yield* S.decodeUnknownEffect(UpstreamSchema)(
    JSON.parse(
      yield* fileSystem.readFileString(
        path.join(rootPath, 'research', 'UPSTREAM.json')
      )
    )
  )

  const artifactPath = path.join(
    rootPath,
    'research',
    'artifacts',
    'xyflow',
    upstream.commit
  )

  const traceNames = (yield* fileSystem.readDirectory(tracesPath)).filter(
    (name) => name.endsWith('.md')
  )

  let citationCount = 0

  for (const traceName of traceNames) {
    const trace = yield* fileSystem.readFileString(
      path.join(tracesPath, traceName)
    )

    if (
      traceName !== 'README.md' &&
      !trace.includes('## Conformity and deviations')
    ) {
      return yield* Effect.die(
        new Error(
          `${traceName} must contain a Conformity and deviations section`
        )
      )
    }

    for (const match of trace.matchAll(citationPattern)) {
      const [, relativePath, lineText] = match

      if (relativePath === undefined || lineText === undefined) {
        continue
      }

      const citedPath = path.join(
        isFlowTraceSourcePath(relativePath) ? rootPath : artifactPath,
        relativePath
      )

      if (!(yield* fileSystem.exists(citedPath))) {
        return yield* Effect.die(
          new Error(`${traceName} cites missing file ${relativePath}`)
        )
      }

      const line = Number(lineText)

      const lineCount = (yield* fileSystem.readFileString(citedPath)).split(
        '\n'
      ).length

      if (!Number.isInteger(line) || line < 1 || line > lineCount) {
        return yield* Effect.die(
          new Error(
            `${traceName} cites ${relativePath}:${lineText}, but the file has ${lineCount} lines`
          )
        )
      }

      citationCount += 1
    }
  }

  yield* Effect.log(
    `Verified ${citationCount} research citations across ${traceNames.length} traces`
  )
})

if (import.meta.main) {
  BunRuntime.runMain(program.pipe(Effect.provide(BunServices.layer)))
}
