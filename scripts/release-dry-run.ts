import { BunRuntime, BunServices } from '@effect/platform-bun'
import { Effect, FileSystem, Path, Schema as S } from 'effect'
import { ChildProcess, ChildProcessSpawner } from 'effect/process'

import { checkPackageArchive } from './package-archive'

const rootUrl = new URL('../', import.meta.url)

const ReleaseManifestSchema = S.Struct({
  archives: S.Array(
    S.Struct({
      file: S.NonEmptyString,
      package: S.NonEmptyString,
      private: S.Boolean,
      version: S.NonEmptyString,
    })
  ),
  dependencyNotices: S.Array(
    S.Struct({
      license: S.NonEmptyString,
      name: S.NonEmptyString,
      version: S.NonEmptyString,
    })
  ),
  effectVersion: S.Literal('4.0.0'),
  flowLicenseStatus: S.Literal('deferred'),
  publishCalled: S.Literal(false),
  upstreamResearchLicense: S.Literal('MIT'),
  status: S.Literal('dry-run'),
})

const RootManifestSchema = S.Struct({
  dependencies: S.optional(S.Record(S.String, S.String)),
})

const PackageManifestSchema = S.Struct({
  dependencies: S.optional(S.Record(S.String, S.String)),
  name: S.NonEmptyString,
  private: S.Boolean,
  peerDependencies: S.optional(S.Record(S.String, S.String)),
  version: S.NonEmptyString,
})

const ExternalManifestSchema = S.Struct({
  license: S.NonEmptyString,
  version: S.NonEmptyString,
})

const hasAlignedEffectLockRecords = (lockfile: string): boolean =>
  !lockfile.includes('4.0.0-rc.117') &&
  lockfile.includes('"effect@4.0.0"') &&
  lockfile.includes('"@effect/platform-browser@4.0.0"') &&
  lockfile.includes('"@effect/platform-node-shared@4.0.0"')

const program = Effect.gen(function* releaseDryRun() {
  const fileSystem = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  const process = yield* ChildProcessSpawner.ChildProcessSpawner
  const root = yield* path.fromFileUrl(rootUrl)

  const temp = yield* fileSystem.makeTempDirectory({
    prefix: 'flow-release-dry-run-',
  })

  const archiveDirectory = path.join(temp, 'archives')

  const run = (command: string, args: readonly string[], cwd: string) =>
    Effect.gen(function* runCommand() {
      const exitCode = yield* process.exitCode(
        ChildProcess.make(command, args, {
          cwd,
          stderr: 'inherit',
          stdout: 'inherit',
        })
      )

      if (exitCode !== 0) {
        return yield* Effect.die(
          new Error(
            `${command} ${args.join(' ')} failed with exit code ${exitCode}`
          )
        )
      }
    })

  const readPackageManifest = (packagePath: string) =>
    Effect.gen(function* readAndDecodePackageManifest() {
      const raw = yield* fileSystem.readFileString(
        path.join(root, packagePath, 'package.json')
      )

      return yield* S.decodeUnknownEffect(PackageManifestSchema)(
        JSON.parse(raw)
      )
    })

  type ReleasePackageManifests = readonly [
    typeof PackageManifestSchema.Type,
    typeof PackageManifestSchema.Type,
    typeof PackageManifestSchema.Type,
    typeof PackageManifestSchema.Type,
  ]

  const hasAlignedEffectVersions = (
    rootManifest: typeof RootManifestSchema.Type,
    [
      coreManifest,
      vanillaManifest,
      vueManifest,
      foldkitManifest,
    ]: ReleasePackageManifests
  ): boolean =>
    [
      rootManifest.dependencies?.effect === '4.0.0',
      rootManifest.dependencies?.['@effect/platform-browser'] === '4.0.0',
      rootManifest.dependencies?.['@effect/platform-bun'] === '4.0.0',
      rootManifest.dependencies?.['@effect/platform-node-shared'] === '4.0.0',
      coreManifest.dependencies?.effect === '4.0.0',
      vanillaManifest.dependencies?.effect === '4.0.0',
      vueManifest.dependencies?.effect === '4.0.0',
      vueManifest.peerDependencies?.vue === '^3.5.43',
      foldkitManifest.dependencies?.effect === '4.0.0',
      foldkitManifest.peerDependencies?.foldkit === '0.169.0',
      foldkitManifest.peerDependencies?.['@effect/platform-browser'] ===
        '4.0.0',
    ].every(Boolean)

  const validateEffectAlignment = (
    rootManifest: typeof RootManifestSchema.Type,
    manifests: ReleasePackageManifests,
    lockfile: string
  ) =>
    Effect.gen(function* checkAlignedEffectRuntime() {
      if (!hasAlignedEffectVersions(rootManifest, manifests)) {
        return yield* Effect.die(
          new Error('Effect packages must all be pinned to 4.0.0')
        )
      }

      if (!hasAlignedEffectLockRecords(lockfile)) {
        return yield* Effect.die(
          new Error(
            'bun.lock must contain only the aligned Effect 4.0.0 package records'
          )
        )
      }
    })

  const readReleaseManifests = Effect.gen(function* readReleaseManifests() {
    const rootManifest = yield* S.decodeUnknownEffect(RootManifestSchema)(
      JSON.parse(
        yield* fileSystem.readFileString(path.join(root, 'package.json'))
      )
    )

    const [coreManifest, vanillaManifest, vueManifest, foldkitManifest] =
      yield* Effect.all(
        [
          readPackageManifest('packages/core'),
          readPackageManifest('apps/vanilla'),
          readPackageManifest('packages/vue'),
          readPackageManifest('packages/foldkit'),
        ],
        { concurrency: 1 }
      )

    const manifests = [
      coreManifest,
      vanillaManifest,
      vueManifest,
      foldkitManifest,
    ] as const

    const lockfile = yield* fileSystem.readFileString(
      path.join(root, 'bun.lock')
    )

    yield* validateEffectAlignment(rootManifest, manifests, lockfile)

    return manifests
  })

  const validateLicenses = Effect.gen(function* validateLicenses() {
    const dependencyNotices: {
      license: string
      name: string
      version: string
    }[] = []

    for (const name of [
      'effect',
      '@effect/platform-browser',
      'foldkit',
      'vue',
    ]) {
      const manifestPath = path.join(root, 'node_modules', name, 'package.json')

      const dependency = yield* S.decodeUnknownEffect(ExternalManifestSchema)(
        JSON.parse(yield* fileSystem.readFileString(manifestPath))
      )

      if (dependency.license !== 'MIT') {
        return yield* Effect.die(
          new Error(
            `Review the ${name} ${dependency.version} notice obligations before a release dry run`
          )
        )
      }

      dependencyNotices.push({
        license: dependency.license,
        name,
        version: dependency.version,
      })
    }

    const xyflowLicense = path.join(
      root,
      'research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/LICENSE'
    )

    if (!(yield* fileSystem.exists(xyflowLicense))) {
      return yield* Effect.die(
        new Error('The pinned xyflow evidence license file is missing')
      )
    }

    const licenseGuide = yield* fileSystem.readFileString(
      path.join(root, 'docs/ui-licensing.md')
    )

    if (
      !licenseGuide.includes('research/artifacts/xyflow/') ||
      !licenseGuide.includes('MIT')
    ) {
      return yield* Effect.die(
        new Error(
          'The UI licensing guide does not document the pinned xyflow evidence notice'
        )
      )
    }

    return dependencyNotices
  })

  const packPackages = (
    manifests: readonly (typeof PackageManifestSchema.Type)[]
  ) =>
    Effect.gen(function* packArchives() {
      yield* run('bun', ['run', 'build:packages'], root)
      yield* fileSystem.makeDirectory(archiveDirectory, { recursive: true })

      const packagePaths = [
        'packages/core',
        'apps/vanilla',
        'packages/vue',
        'packages/foldkit',
      ]

      for (const packagePath of packagePaths) {
        yield* run(
          'bun',
          ['pm', 'pack', '--destination', archiveDirectory],
          path.join(root, packagePath)
        )
      }

      yield* run('bun', ['run', 'test:consumer'], root)

      const archiveNames = yield* fileSystem.readDirectory(archiveDirectory)

      return manifests.map((manifest) => {
        const file = archiveNames.find((name) =>
          name.startsWith(`${manifest.name.replace('@flow/', 'flow-')}-`)
        )

        if (file === undefined) {
          throw new Error(`Missing packed archive for ${manifest.name}`)
        }

        checkPackageArchive(path.join(archiveDirectory, file), manifest.name)

        return {
          file,
          package: manifest.name,
          private: manifest.private,
          version: manifest.version,
        }
      })
    })

  const execute = Effect.gen(function* executeDryRun() {
    const manifests = yield* readReleaseManifests
    const dependencyNotices = yield* validateLicenses

    const archives = yield* packPackages(manifests)

    const manifest = S.decodeUnknownSync(ReleaseManifestSchema)({
      archives,
      dependencyNotices,
      effectVersion: '4.0.0',
      flowLicenseStatus: 'deferred',
      publishCalled: false,
      upstreamResearchLicense: 'MIT',
      status: 'dry-run',
    })

    yield* Effect.log(JSON.stringify(manifest, null, 2))
    yield* Effect.log(
      'Flow package licensing remains deferred; this manifest is not release approval. No publish or tag command ran.'
    )
  })

  yield* Effect.ensuring(
    execute,
    fileSystem.remove(temp, { force: true, recursive: true }).pipe(Effect.orDie)
  )
})

BunRuntime.runMain(program.pipe(Effect.provide(BunServices.layer)))
