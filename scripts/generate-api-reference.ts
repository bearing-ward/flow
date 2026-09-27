import { BunRuntime, BunServices } from '@effect/platform-bun'
import { Effect, FileSystem, Match, Path, Predicate, Schema as S } from 'effect'
import type { AST } from 'effect/SchemaAST'

import {
  FlowChangeSchema,
  FlowCommandSchema,
  FlowDocumentSchema,
  FlowEdgeSchema,
  FlowNodeSchema,
  FlowSnapshotSchema,
  FlowStateChangeSchema,
  SavedFlowDocumentSchema,
} from '../packages/core/src/public.ts'

const rootUrl = new URL('../', import.meta.url)

const outputPath = 'docs/api-reference.md'

const indent = (depth: number): string => '  '.repeat(depth)

const renderAst = (ast: AST, depth = 0): string =>
  Match.value(ast).pipe(
    Match.tagsExhaustive({
      String: () => 'string',
      Number: () => 'number',
      Boolean: () => 'boolean',
      BigInt: () => 'bigint',
      Literal: (literal) => JSON.stringify(literal.literal),
      Null: () => 'null',
      Undefined: () => 'undefined',
      Void: () => 'void',
      Never: () => 'never',
      Unknown: () => 'unknown',
      Any: () => 'unknown',
      ObjectKeyword: () => 'object',
      Symbol: () => 'symbol',
      UniqueSymbol: () => 'symbol',
      Enum: () => 'string | number',
      TemplateLiteral: () => 'string',
      Declaration: () => 'JsonValue',
      Suspend: (suspend) => renderAst(suspend.thunk(), depth),
      Arrays: (array) => {
        const element = array.rest[0] ?? array.elements[0]

        return `ReadonlyArray<${element === undefined ? 'unknown' : renderAst(element, depth)}>`
      },
      Union: (union) => {
        const members = union.types.map((member) => renderAst(member, depth))

        if (members.every((member) => !member.includes('\n'))) {
          return members.join(' | ')
        }

        return members
          .map(
            (member, index) =>
              `${index === 0 ? '' : `${indent(depth)}| `}${member}`
          )
          .join('\n')
      },
      Objects: (object) => {
        const properties = object.propertySignatures.map((property) => {
          const optional = property.type.context?.isOptional === true
          let { type } = property

          if (Predicate.isTagged(type, 'Union') && optional) {
            const defined = type.types.filter(
              (member) => !Predicate.isTagged(member, 'Undefined')
            )

            if (defined.length === 1) {
              type = defined[0] ?? type
            }
          }

          const name = S.is(S.String)(property.name)
            ? property.name
            : JSON.stringify(property.name)

          return `${indent(depth + 1)}readonly ${name}${optional ? '?' : ''}: ${renderAst(type, depth + 1)};`
        })

        if (object.indexSignatures.length > 0 && properties.length === 0) {
          return 'Readonly<Record<string, JsonValue>>'
        }

        return properties.length === 0
          ? 'Record<never, never>'
          : `{\n${properties.join('\n')}\n${indent(depth)}}`
      },
    })
  )

const schemaSection = (title: string, name: string, ast: AST): string =>
  `## ${title}\n\nGenerated from \`${name}\` in \`packages/core/src/public.ts\`.\n\n\`\`\`ts\nexport type ${name.replace('Schema', '')} = ${renderAst(ast)};\n\`\`\``

const renderReference = (): string =>
  [
    '# Schema API reference',
    '',
    'This file is generated from the exported Effect Schemas. Run `bun run docs:generate-api` after changing a public schema. It describes decoded values; see [the JavaScript API](public-api.md) for host acquisition and lifecycle.',
    'The TypeScript shapes show decoded field types. Branded identifiers appear as strings here; runtime schemas also enforce non-empty ids, valid stroke colors, finite positive sizes and zoom, and document integrity rules such as unique ids and valid edge endpoints.',
    '',
    '`JsonValue` below is the recursive JSON type admitted by `FlowNode.data`.',
    '',
    '```ts',
    'export type JsonValue = null | boolean | number | string | ReadonlyArray<JsonValue> | Readonly<Record<string, JsonValue>>;',
    '```',
    '',
    '',
    schemaSection('Node', 'FlowNodeSchema', FlowNodeSchema.ast),
    schemaSection('Edge', 'FlowEdgeSchema', FlowEdgeSchema.ast),
    schemaSection('Document', 'FlowDocumentSchema', FlowDocumentSchema.ast),
    schemaSection('Commands', 'FlowCommandSchema', FlowCommandSchema.ast),
    schemaSection('Changes', 'FlowChangeSchema', FlowChangeSchema.ast),
    schemaSection('Snapshot', 'FlowSnapshotSchema', FlowSnapshotSchema.ast),
    schemaSection(
      'Accepted-state change',
      'FlowStateChangeSchema',
      FlowStateChangeSchema.ast
    ),
    schemaSection(
      'Accepted state snapshot',
      'FlowSnapshotSchema',
      FlowSnapshotSchema.ast
    ),
    schemaSection(
      'Accepted state notification',
      'FlowStateChangeSchema',
      FlowStateChangeSchema.ast
    ),
    schemaSection(
      'Saved envelope',
      'SavedFlowDocumentSchema',
      SavedFlowDocumentSchema.ast
    ),
  ].join('\n\n')

const program = Effect.gen(function* generateApiReference() {
  const fileSystem = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  const root = yield* path.fromFileUrl(rootUrl)
  const target = path.join(root, outputPath)
  const expected = renderReference()
  const checkOnly = Bun.argv.includes('--check')

  if (checkOnly) {
    const existing = yield* fileSystem.readFileString(target)

    if (existing !== expected) {
      return yield* Effect.die(
        new Error(`${outputPath} is stale; run bun run docs:generate-api`)
      )
    }

    yield* Effect.log(`Verified generated ${outputPath}`)

    return
  }

  yield* fileSystem.writeFileString(target, expected)
  yield* Effect.log(`Wrote ${outputPath} from Effect Schema ASTs`)
})

BunRuntime.runMain(program.pipe(Effect.provide(BunServices.layer)))
