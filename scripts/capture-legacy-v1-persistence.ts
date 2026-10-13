import { createHash } from 'node:crypto'
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { mkdir, mkdtemp, readFile, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { Schema } from 'effect'

const { dirname, join, resolve } = path

const revision = 'de36b4f64fe80d99886c0b7a9fb505258b872ac9'

const fixturePath = 'packages/conformance/src/fixtures/legacy-v1-persistence'

const root = resolve(import.meta.dir, '..')

const check = process.argv.includes('--check')

const packageVersion = Schema.Struct({ version: Schema.String })

const effect = Schema.decodeUnknownSync(packageVersion)(
  JSON.parse(
    await readFile(join(root, 'node_modules/effect/package.json'), 'utf-8')
  )
).version

const typescript = Schema.decodeUnknownSync(packageVersion)(
  JSON.parse(
    await readFile(join(root, 'node_modules/typescript/package.json'), 'utf-8')
  )
).version

if (
  effect !== '4.0.0-rc.116' ||
  typescript !== '5.9.3' ||
  Bun.version !== '1.4.3'
) {
  throw new Error(
    `Frozen capture runtime drift: Bun ${Bun.version}, Effect ${effect}, TypeScript ${typescript}`
  )
}

const approvedDeclarations = [
  'duplicate-edge-id',
  'duplicate-handle-id',
  'duplicate-node-id',
  'flow-delete-approval-failed-error',
  'flow-delete-cancelled-error',
  'flow-delete-error',
  'flow-delete-in-progress-error',
  'flow-delete-invalid-candidate-error',
  'flow-delete-revision-error',
  'flow-edit-disposed-error',
  'flow-edit-error',
  'flow-persistence',
  'flow-runtime.schema',
  'flow-snap-grid.schema',
  'flow-values',
  'flow.schema',
  'missing-edge-endpoint',
  'missing-edge-handle',
  'missing-parent-node',
  'parent-cycle',
  'parent-extent-without-parent',
  'self-parent-node',
]
  .map((file) => `domain/${file}.d.ts`)
  .toSorted()

const hash = (value: string): string =>
  createHash('sha256').update(value).digest('hex')

const run = (command: readonly string[], cwd: string): string => {
  const result = Bun.spawnSync([...command], {
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
  })

  if (result.exitCode !== 0) {
    throw new Error(
      `${command.join(' ')} failed (${result.exitCode}): ${result.stderr.toString()}`
    )
  }

  return result.stdout.toString()
}

const temporary = await mkdtemp(join(tmpdir(), 'flow-075-frozen-'))

const checkout = join(temporary, 'baseline')

await mkdir(checkout)

run(
  [
    'git',
    'archive',
    '--format=tar',
    `--output=${join(temporary, 'baseline.tar')}`,
    revision,
    'packages/core',
    'tsconfig.json',
    'package.json',
  ],
  root
)

run(['tar', '-xf', join(temporary, 'baseline.tar'), '-C', checkout], root)

await symlink(join(root, 'node_modules'), join(checkout, 'node_modules'), 'dir')

const stage = join(temporary, 'fixture')

await mkdir(stage)

const bundle = join(stage, 'baseline-reader-writer.js')

run(
  [
    'bun',
    'build',
    'packages/core/src/domain/flow-persistence.ts',
    '--target=bun',
    '--external',
    'effect',
    '--outfile',
    bundle,
  ],
  checkout
)

run(
  [
    'bun',
    join(root, 'node_modules/typescript/bin/tsc'),
    '--project',
    'packages/core/tsconfig.build.json',
  ],
  checkout
)

const declarationRoot = join(checkout, 'packages/core/dist')

const declarations = new Set<string>()

const pending = ['domain/flow-persistence.d.ts']

while (pending.length !== 0) {
  const file = pending.pop()

  if (file === undefined || declarations.has(file)) {
    continue
  }

  declarations.add(file)
  const source = readFileSync(join(declarationRoot, file), 'utf-8')

  for (const match of source.matchAll(
    /(?:from\s+|import\()['"](?<specifier>[^'"]+)['"]/gu
  )) {
    const specifier = match.groups?.specifier

    if (specifier?.startsWith('.')) {
      const absolute = resolve(
        declarationRoot,
        dirname(file),
        specifier.replace(/\.ts$/u, '.d.ts')
      )

      const relative = absolute.slice(declarationRoot.length + 1)

      if (!relative.startsWith('domain/')) {
        throw new Error(`Unexpected frozen declaration ${relative}`)
      }

      pending.push(relative)
    }
  }

  const output = join(stage, 'declarations', file)
  mkdirSync(dirname(output), { recursive: true })
  cpSync(join(declarationRoot, file), output)
}

if (
  JSON.stringify([...declarations].toSorted()) !==
  JSON.stringify(approvedDeclarations)
) {
  throw new Error(
    'Frozen declaration closure differs from the approved exact 22 paths'
  )
}

await writeFile(
  join(stage, 'baseline-reader-writer.d.ts'),
  "export * from './declarations/domain/flow-persistence.js'\n"
)

const representative = run(
  [
    'bun',
    '-e',
    `
import { Effect } from 'effect';
import { decodeSavedFlowDocument, encodeSavedFlowDocument, encodeSavedFlowSession } from './packages/core/src/domain/flow-persistence.ts';
const document = Effect.runSync(decodeSavedFlowDocument({ version: 1, document: {
 nodes: [
 { id: 'parent', label: '', position: { x: 12, y: -4 }, type: 'group', data: { nested: [true, 0, ''] }, zIndex: -2,
   size: { width: 320, height: 200 }, selectable: false, focusable: false, draggable: false, deletable: false,
   ariaLabel: 'Parent', ariaDescription: 'Legacy details', hidden: false, handles: [{ id: 'out', kind: 'source', side: 'right' }] },
 { id: 'child', label: 'Child', position: { x: 20, y: 30 }, parentId: 'parent', extent: 'parent',
   size: { width: 80, height: 40 }, handles: [{ id: 'in', kind: 'target', side: 'left' }] }
 ], edges: [{ id: 'edge', source: 'parent', target: 'child', sourceHandle: 'out', targetHandle: 'in',
 type: 'custom', path: 'smoothstep', label: '', data: { enabled: false }, markerStart: 'arrow', markerEnd: 'arrowclosed',
 stroke: '#123abc', strokeWidth: 2, selectable: false, focusable: false, deletable: false, reconnectable: 'source',
 interactionWidth: 12, ariaLabel: 'Legacy edge', hidden: false, zIndex: 3 }] } }));
const selected = { ...document, nodes: document.nodes.map(node => ({ ...node, selected: true })), edges: document.edges.map(edge => ({ ...edge, selected: true })) };
console.log(JSON.stringify({ document: encodeSavedFlowDocument(selected), session: encodeSavedFlowSession(selected, { x: 8, y: -9, zoom: 1.5 }) }));
`,
  ],
  checkout
)

await writeFile(
  join(stage, 'representative.json'),
  `${JSON.stringify(JSON.parse(representative), null, 2)}\n`
)

run(
  [
    'bun',
    join(root, 'node_modules/oxfmt/bin/oxfmt'),
    '--config',
    join(root, 'oxfmt.config.ts'),
    stage,
  ],
  root
)

const sourceHashes: Record<string, string> = {}

const rawBundle = await readFile(bundle, 'utf-8')

for (const match of rawBundle.matchAll(
  /^\/\/ (?<file>packages\/core\/src\/.+\.ts)$/gmu
)) {
  const file = match.groups?.file

  if (file !== undefined) {
    sourceHashes[file] = hash(readFileSync(join(checkout, file), 'utf-8'))
  }
}

const files = [
  'baseline-reader-writer.js',
  'baseline-reader-writer.d.ts',
  'representative.json',
  ...[...declarations].toSorted().map((file) => `declarations/${file}`),
]

const artifactHashes: Record<string, string> = {}

for (const file of files) {
  artifactHashes[file] = hash(readFileSync(join(stage, file), 'utf-8'))
}

const packageSource = await readFile(join(checkout, 'package.json'), 'utf-8')

const manifest = {
  revision,
  bun: Bun.version,
  effect,
  typescript,
  packageHash: hash(packageSource),
  entry: 'packages/core/src/domain/flow-persistence.ts',
  target: 'bun',
  external: ['effect'],
  sourceHashes,
  artifactHashes,
}

await writeFile(
  join(stage, 'provenance.json'),
  `${JSON.stringify(manifest, null, 2)}\n`
)

run(
  [
    'bun',
    join(root, 'node_modules/oxfmt/bin/oxfmt'),
    '--config',
    join(root, 'oxfmt.config.ts'),
    join(stage, 'provenance.json'),
  ],
  root
)

files.push('provenance.json')

const destinationRoot = join(root, fixturePath)

if (existsSync(destinationRoot)) {
  const actualFiles = [
    ...new Bun.Glob('**/*').scanSync({ cwd: destinationRoot, onlyFiles: true }),
  ].toSorted()

  if (JSON.stringify(actualFiles) !== JSON.stringify([...files].toSorted())) {
    throw new Error('Frozen fixture contains missing or extraneous files')
  }
}

for (const file of files) {
  const captured = readFileSync(join(stage, file), 'utf-8')
  const destination = join(root, fixturePath, file)

  if (check) {
    if (readFileSync(destination, 'utf-8') !== captured) {
      throw new Error(`Frozen fixture drift: ${file}`)
    }
  } else {
    mkdirSync(dirname(destination), { recursive: true })
    writeFileSync(destination, captured)
  }
}

console.log(
  `${check ? 'Checked' : 'Captured'} frozen ${revision}: ${files.length} files, ${Object.keys(sourceHashes).length} source hashes`
)
