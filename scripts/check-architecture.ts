import { BunRuntime, BunServices } from '@effect/platform-bun'
import { Effect, FileSystem, Path } from 'effect'

import {
  findArchitectureViolations,
  findOptionalIntegrationPackageViolations,
} from './architecture-rules.ts'

const rootUrl = new URL('../', import.meta.url)

const fixtureChecks = (): readonly string[] => {
  const fixtures = [
    {
      expected: 'pass',
      path: 'packages/core/src/domain/allowed.ts',
      text: 'import { FlowNodeSchema } from "../flow.schema.ts";\nexport { FlowNodeSchema };',
    },
    {
      expected: 'pass',
      path: 'packages/core/src/domain/allowed-local-document.ts',
      text: 'const document = { nodes: [] };\nexport const count = document.nodes.length;',
    },
    {
      expected: 'fail',
      path: 'packages/core/src/domain/forbidden-app.ts',
      text: 'import "../../../apps/vanilla/src/public.ts";',
    },
    {
      expected: 'fail',
      path: 'packages/core/src/public.ts',
      text: 'import "../../../../apps/vanilla/src/public.ts";',
    },
    {
      expected: 'fail',
      path: 'packages/core/src/geometry/forbidden-app.ts',
      text: 'import "../../../../apps/vue/src/public.ts";',
    },
    {
      expected: 'pass',
      path: 'packages/core/src/public-core-import.ts',
      text: 'import { FlowNodeSchema } from "@flow/core";\nexport { FlowNodeSchema };',
    },
    {
      expected: 'fail',
      path: 'apps/vue/src/direct-adapter-source.ts',
      text: 'import "../../../packages/vue/src/flow-canvas.ts";',
    },
    {
      expected: 'fail',
      path: 'packages/vue/src/forbidden-app-import.ts',
      text: 'import "../../../apps/vue/src/main.ts";',
    },
    {
      expected: 'pass',
      path: 'apps/vue/src/public-adapter-import.ts',
      text: 'import { FlowCanvas } from "@flow/vue";\nexport { FlowCanvas };',
    },
    {
      expected: 'fail',
      path: 'packages/core/src/domain/forbidden-browser.ts',
      text: 'export const title = window.document.title;',
    },
    {
      expected: 'fail',
      path: 'apps/vanilla/src/forbidden-research.ts',
      text: 'import "../../../../research/artifacts/xyflow/example.ts";',
    },
    {
      expected: 'pass',
      path: 'apps/vanilla/src/allowed-browser.ts',
      text: 'export const title = globalThis.document.title;',
    },
  ] as const

  const failures: string[] = []

  for (const owner of [
    'packages/core',
    'packages/vue',
    'packages/foldkit',
    'apps/vanilla',
  ]) {
    for (const text of [
      "const workflow = import('@flow/workflow')",
      "import { WorkflowAiProvider } from '@flow/workflow'",
      "export { startWorkflowAiSession } from '@flow/workflow/ai'",
      "import { makeLocalWorkflowAiProvider } from '../../../packages/workflow/src/workflow-ai-local.ts'",
      "export { startWorkflowRun } from '@flow/workflow/runner'",
      "import { startWorkflowRun } from '../../../packages/workflow/src/workflow-runner.ts'",
      "export { decodeSavedWorkflow } from '@flow/workflow/persistence'",
      "import { decodeSavedWorkflow } from '../../../packages/workflow/src/workflow-persistence.ts'",
      "export type { WorkflowExecutionPlan } from '@flow/workflow/preparation'",
      "import { prepareWorkflowExecution } from '../../../packages/workflow/src/workflow-preparation.ts'",
      "import type { WorkflowEdit } from '@flow/workflow'",
      "export * from '../../../packages/workflow/src/public.ts'",
    ]) {
      const source = { path: `${owner}/src/forbidden-workflow.ts`, text }

      if (findArchitectureViolations(source).length === 0) {
        failures.push(`${source.path}: workflow boundary did not reject import`)
      }
    }
  }

  for (const source of [
    {
      path: 'packages/workflow/src/allowed-core.ts',
      text: "export { FlowDocumentSchema } from '@flow/core'",
    },
    {
      path: 'apps/vanilla/workflow-contracts/main.ts',
      text: "import { decodeWorkflowDocument } from '@flow/workflow'",
    },
  ]) {
    if (findArchitectureViolations(source).length !== 0) {
      failures.push(
        `${source.path}: optional workflow composition must be allowed`
      )
    }
  }

  for (const owner of [
    'packages/core',
    'packages/vue',
    'packages/foldkit',
    'apps/vanilla',
  ]) {
    for (const dependency of [
      'libavoid-js',
      '@flow/routing-libavoid',
      'playwright',
      'playwright-core',
      '@playwright/test',
      '@flow/image-service',
      'yjs',
      'y-websocket',
      'y-protocols',
      '@y/websocket-server',
      '@flow/collaboration-yjs',
      '@flow/workflow',
      '../../../packages/workflow/src/public.ts',
    ]) {
      if (
        findArchitectureViolations({
          path: `${owner}/src/forbidden-routing.ts`,
          text: `export { router } from '${dependency}'`,
        }).length === 0 ||
        findOptionalIntegrationPackageViolations({
          path: `${owner}/package.json`,
          text: JSON.stringify({
            optionalDependencies: { [dependency]: '0.0.0' },
          }),
        }).length === 0
      ) {
        failures.push(
          `${owner}: optional integration isolation rule did not reject ${dependency}`
        )
      }
    }
  }

  if (
    findArchitectureViolations({
      path: 'packages/routing-libavoid/src/public.ts',
      text: "import { AvoidLib } from 'libavoid-js'",
    }).length !== 0
  ) {
    failures.push('Optional routing owner must be allowed to import its engine')
  }

  for (const fixture of fixtures) {
    const violations = findArchitectureViolations(fixture)

    const matchesExpectation =
      fixture.expected === 'pass'
        ? violations.length === 0
        : violations.length > 0

    if (!matchesExpectation) {
      failures.push(
        `${fixture.path}: expected ${fixture.expected}, got ${violations.join('; ') || 'no violations'}`
      )
    }
  }

  return failures
}

const program = Effect.gen(function* checkArchitecture() {
  const fileSystem = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  const root = yield* path.fromFileUrl(rootUrl)
  const fixtureFailures = fixtureChecks()

  if (fixtureFailures.length > 0) {
    return yield* Effect.die(
      new Error(
        `Architecture rule fixtures failed:\n${fixtureFailures.join('\n')}`
      )
    )
  }

  const files = yield* Effect.tryPromise({
    try: async () => {
      const found: string[] = []

      const sourceGlob = new Bun.Glob(
        '{packages,apps}/**/src/**/*.{ts,tsx,js,jsx}'
      )

      for await (const file of sourceGlob.scan({ cwd: root })) {
        found.push(file)
      }

      return found.toSorted()
    },
    catch: (error) => error,
  })

  const violations: string[] = []

  for (const file of files) {
    const sourcePath = path.join(root, file)
    const text = yield* fileSystem.readFileString(sourcePath)
    violations.push(...findArchitectureViolations({ path: file, text }))
  }

  for (const owner of [
    'packages/core',
    'packages/vue',
    'packages/foldkit',
    'apps/vanilla',
  ]) {
    const manifestPath = `${owner}/package.json`
    violations.push(
      ...findOptionalIntegrationPackageViolations({
        path: manifestPath,
        text: yield* fileSystem.readFileString(path.join(root, manifestPath)),
      })
    )
  }

  if (violations.length > 0) {
    return yield* Effect.die(
      new Error(`Architecture boundaries failed:\n${violations.join('\n')}`)
    )
  }

  yield* Effect.log(
    `Verified architecture boundaries across ${files.length} production source files; all rule fixtures passed`
  )
})

BunRuntime.runMain(program.pipe(Effect.provide(BunServices.layer)))
