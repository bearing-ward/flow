import { defineConfig } from 'oxlint'
import core from 'ultracite/oxlint/core'
import vitest from 'ultracite/oxlint/vitest'

const localIgnores = [
  '.agent/**',
  '.agents/**',
  '.claude/**',
  '.codex/**',
  '.continue/**',
  '.cursor/**',
  '.gemini/**',
  '.opencode/**',
  '.pi/**',
  '.roo/**',
  '.windsurf/**',
  'apps/vanilla/dist/**',
  'research/artifacts/**',
  'research/generated/**',
  'tools/oxlint/anti-slop/**',
]

export default defineConfig({
  extends: [core, vitest],
  ignorePatterns: [...core.ignorePatterns, ...localIgnores],
  overrides: [
    {
      // Frozen compiler output, checked byte-for-byte by the capture generator.
      files: [
        'packages/conformance/src/fixtures/legacy-v1-persistence/baseline-reader-writer.js',
      ],
      rules: {
        'anti-slop/require-readable-spacing': 'off',
        'no-var': 'off',
        'vars-on-top': 'off',
        'no-duplicate-imports': 'off',
        'import/first': 'off',
        'no-unused-vars': 'off',
        'import/newline-after-import': 'off',
        'unicorn/empty-brace-spaces': 'off',
        'import/no-mutable-exports': 'off',
        'no-useless-return': 'off',
        'import/no-duplicates': 'off',
        'max-classes-per-file': 'off',
      },
    },
    {
      // This exact closed list is the baseline tsc declaration dependency closure.
      files: [
        'packages/conformance/src/fixtures/legacy-v1-persistence/declarations/domain/duplicate-edge-id.d.ts',
        'packages/conformance/src/fixtures/legacy-v1-persistence/declarations/domain/duplicate-handle-id.d.ts',
        'packages/conformance/src/fixtures/legacy-v1-persistence/declarations/domain/duplicate-node-id.d.ts',
        'packages/conformance/src/fixtures/legacy-v1-persistence/declarations/domain/flow-delete-approval-failed-error.d.ts',
        'packages/conformance/src/fixtures/legacy-v1-persistence/declarations/domain/flow-delete-cancelled-error.d.ts',
        'packages/conformance/src/fixtures/legacy-v1-persistence/declarations/domain/flow-delete-error.d.ts',
        'packages/conformance/src/fixtures/legacy-v1-persistence/declarations/domain/flow-delete-in-progress-error.d.ts',
        'packages/conformance/src/fixtures/legacy-v1-persistence/declarations/domain/flow-delete-invalid-candidate-error.d.ts',
        'packages/conformance/src/fixtures/legacy-v1-persistence/declarations/domain/flow-delete-revision-error.d.ts',
        'packages/conformance/src/fixtures/legacy-v1-persistence/declarations/domain/flow-edit-disposed-error.d.ts',
        'packages/conformance/src/fixtures/legacy-v1-persistence/declarations/domain/flow-edit-error.d.ts',
        'packages/conformance/src/fixtures/legacy-v1-persistence/declarations/domain/flow-persistence.d.ts',
        'packages/conformance/src/fixtures/legacy-v1-persistence/declarations/domain/flow-runtime.schema.d.ts',
        'packages/conformance/src/fixtures/legacy-v1-persistence/declarations/domain/flow-snap-grid.schema.d.ts',
        'packages/conformance/src/fixtures/legacy-v1-persistence/declarations/domain/flow-values.d.ts',
        'packages/conformance/src/fixtures/legacy-v1-persistence/declarations/domain/flow.schema.d.ts',
        'packages/conformance/src/fixtures/legacy-v1-persistence/declarations/domain/missing-edge-endpoint.d.ts',
        'packages/conformance/src/fixtures/legacy-v1-persistence/declarations/domain/missing-edge-handle.d.ts',
        'packages/conformance/src/fixtures/legacy-v1-persistence/declarations/domain/missing-parent-node.d.ts',
        'packages/conformance/src/fixtures/legacy-v1-persistence/declarations/domain/parent-cycle.d.ts',
        'packages/conformance/src/fixtures/legacy-v1-persistence/declarations/domain/parent-extent-without-parent.d.ts',
        'packages/conformance/src/fixtures/legacy-v1-persistence/declarations/domain/self-parent-node.d.ts',
      ],
      rules: {
        'anti-slop/require-readable-spacing': 'off',
        'import/newline-after-import': 'off',
        'typescript/consistent-type-imports': 'off',
        'unicorn/require-module-specifiers': 'off',
        'typescript/consistent-indexed-object-style': 'off',
      },
    },
    {
      files: [
        'packages/conformance/src/fixtures/legacy-v1-persistence/declarations/domain/flow-edit-disposed-error.d.ts',
      ],
      rules: {
        'typescript/ban-types': 'off',
        'typescript/no-empty-object-type': 'off',
      },
    },
    {
      files: [
        'packages/conformance/src/fixtures/legacy-v1-persistence/declarations/domain/flow.schema.d.ts',
      ],
      rules: { 'anti-slop/no-unknown-parameters': 'off' },
    },
  ],
  jsPlugins: [
    { name: 'anti-slop', specifier: './tools/oxlint/anti-slop/index.ts' },
    {
      name: 'anti-slop-effect',
      specifier: './tools/oxlint/anti-slop/effect/index.ts',
    },
  ],
  rules: {
    'sort-keys': 'off',
    'anti-slop-effect/no-manual-effect-error-tag': 'error',
    'anti-slop-effect/no-manual-tag-comparison': 'error',
    'anti-slop-effect/no-manual-tagged-construction': 'error',
    'anti-slop-effect/no-service-constructor-imports': 'error',
    'anti-slop-effect/prefer-effect-match': 'error',
    'anti-slop/no-array-filter-map': 'error',
    'anti-slop/no-chained-type-assertions': 'error',
    'anti-slop/no-conditional-empty-object-spread': 'error',
    'anti-slop/no-known-value-widening': 'error',
    'anti-slop/no-module-mocking': 'error',
    'anti-slop/no-object-parameters': 'error',
    'anti-slop/no-reduce-accumulator-copy': 'error',
    'anti-slop/no-reflect-apply': 'error',
    'anti-slop/no-reflect-get': 'error',
    'anti-slop/no-runtime-typeof': 'error',
    'anti-slop/no-shape-in-symbol-names': 'error',
    'anti-slop/no-unknown-parameters': 'error',
    'anti-slop/no-unknown-returns': 'error',
    'anti-slop/no-unknown-type-aliases': 'error',
    'anti-slop/no-unsafe-dictionary-type': 'error',
    'anti-slop/no-widen-then-assert': 'error',
    'anti-slop/require-readable-spacing': 'error',
    'anti-slop/require-safety-comment-for-type-assertion': 'error',
    'oxc/no-accumulating-spread': 'error',
    'vitest/no-standalone-expect': [
      'error',
      {
        additionalTestBlockFunctions: ['it.effect'],
      },
    ],
  },
})
