import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const checkout = '/tmp/chartdb-ref/src'
const commit = 'c24936a402bb3e24b4858f05282d69a04fcfe25b'
const actual = execFileSync('git', ['-C', checkout, 'rev-parse', 'HEAD'], {
  encoding: 'utf8',
}).trim()
if (actual !== commit) throw new Error(`Wrong ChartDB commit: ${actual}`)
const hash = (data) => createHash('sha256').update(data).digest('hex')
const files = [
  'src/pages/editor-page/canvas/canvas.tsx',
  'src/pages/editor-page/canvas/canvas-utils.ts',
  'src/pages/editor-page/canvas/marker-definitions.tsx',
  'src/pages/editor-page/canvas/show-all-button.tsx',
  'src/lib/utils/area-utils.ts',
  'src/context/storage-context/storage-provider.tsx',
  'src/pages/editor-page/editor-page.tsx',
  'src/pages/editor-page/canvas/canvas-context-menu.tsx',
  'src/pages/editor-page/canvas/table-node/table-node.tsx',
  'src/pages/editor-page/canvas/table-node/table-node-field.tsx',
  'src/pages/editor-page/canvas/table-node/table-node-dependency-indicator.tsx',
  'src/pages/editor-page/canvas/table-node/table-node-context-menu.tsx',
  'src/pages/editor-page/canvas/area-node/area-node.tsx',
  'src/pages/editor-page/canvas/note-node/note-node.tsx',
  'src/pages/editor-page/canvas/relationship-edge/relationship-edge.tsx',
  'src/pages/editor-page/canvas/dependency-edge/dependency-edge.tsx',
  'src/pages/editor-page/canvas/toolbar/toolbar.tsx',
  'src/pages/editor-page/canvas/canvas-filter/canvas-filter.tsx',
  'src/pages/editor-page/canvas/canvas-filter/filter-item-actions.tsx',
  'src/pages/editor-page/top-navbar/menu/menu.tsx',
  'src/pages/editor-page/side-panel/tables-section/table-list/table-list-item/table-list-item-header/table-list-item-header.tsx',
  'src/dialogs/create-diagram-dialog/create-diagram-dialog.tsx',
  'src/dialogs/common/import-database/import-database.tsx',
  'src/dialogs/import-database-dialog/import-database-dialog.tsx',
  'src/lib/dbml/dbml-import/dbml-import.ts',
  'src/lib/domain/db-table.ts',
  'src/hooks/use-focus-on.ts',
  'src/pages/editor-page/canvas/hooks/use-is-lost-in-canvas.tsx',
  'src/hooks/use-update-table.ts',
  'src/context/local-config-context/local-config-provider.tsx',
  'src/context/chartdb-context/chartdb-provider.tsx',
  'src/context/history-context/history-provider.tsx',
  'src/context/keyboard-shortcuts-context/keyboard-shortcuts.ts',
  'src/context/keyboard-shortcuts-context/keyboard-shortcuts-provider.tsx',
  'src/context/export-image-context/export-image-provider.tsx',
  'src/dialogs/export-image-dialog/export-image-dialog.tsx',
  'node_modules/@xyflow/react/dist/esm/index.mjs',
  'node_modules/@xyflow/system/dist/esm/index.mjs',
]
const evidence = []
for (const path of files) {
  const bytes = await readFile(`${checkout}/${path}`)
  evidence.push({
    path,
    sha256: hash(bytes),
    lines: bytes.toString().split('\n').length,
  })
}
const lock = await readFile(`${checkout}/package-lock.json`)
const rf = JSON.parse(
  await readFile(`${checkout}/node_modules/@xyflow/react/package.json`, 'utf8')
)
const system = JSON.parse(
  await readFile(`${checkout}/node_modules/@xyflow/system/package.json`, 'utf8')
)
const sample = await readFile(
  new URL(
    '../../../apps/shared/schema-studio/sample-schema.dbml',
    import.meta.url
  )
)
const result = {
  checkout,
  commit,
  packageLockSha256: hash(lock),
  reactFlow: rf.version,
  xyflowSystem: system.version,
  sampleDbmlSha256: hash(sample),
  files: evidence,
}
await writeFile(
  fileURLToPath(new URL('results/sources.json', import.meta.url)),
  `${JSON.stringify(result, null, 2)}\n`
)
