import { readFile, writeFile } from 'node:fs/promises'

const json = async (name) =>
  JSON.parse(
    await readFile(new URL(`results/${name}.json`, import.meta.url), 'utf8')
  )
const run = await json('run'),
  sources = await json('sources'),
  settings = await json('settings')
const verification = await json('verification-scope').catch(() => null)
const verificationBoundary = verification?.baselineException
  ? 'Focused verification passes in the temporary copy after normalizing the pre-existing one-line Plan 121 formatting issue there. The original worktree quality gate still fails on that unchanged plan. Root lint and formatting excluding that plan pass. The exact scope and exception are in results/verification-scope.json; results/verification.log includes the original failure and the focused pass.'
  : 'results/verification-scope.json and results/verification.log record the focused Flow baseline with browser lists empty. The original worktree quality check runs separately.'
const spec = (
  await readFile(new URL('scenarios.spec.mjs', import.meta.url), 'utf8')
).split('\n')
const C = 'src/pages/editor-page/canvas/'
const RF = 'node_modules/@xyflow/react/dist/esm/index.mjs'
const XY = 'node_modules/@xyflow/system/dist/esm/index.mjs'
const f = (n) => Math.round(n * 1000) / 1000
const xy = (p) => `(${f(p.x)}, ${f(p.y)})`
const size = (n) => `${n.width} × ${n.height}`
const steps = [
  'Create the fixture through the UI. Reload its saved diagram in a fresh browser context and click Show All.',
  'Drag authors by 43 × 27 screen pixels without snapping, with the magnet toggle, and with Shift pressed after the first 4px of an active drag. Release Shift after pointer-up.',
  'Select authors. Drag its country_code source handle onto publishers.country_code.',
  'Drag publishers to the left of books. Read the books.publisher_id → publishers.id SVG path and marker sides before and after.',
  'Select books and inspect connected edges. Click an unobstructed point on one connected relationship and inspect the selected edge.',
  'For Backspace and Delete, edit the sidebar Filter input, delete inventory on the canvas, and undo. Repeat the keys inside a note textarea.',
  'Click authors, then books while holding Shift, Meta, or Control. Dismiss any context menu. Shift-drag a full box around inventory, then a box intersecting only part of it.',
  'Drag the Catalog grip by 44 × 33 screen pixels and compare all six member tables with nonmembers.',
  'Select inventory, a note, and Sales. Drag the table right resize line or the note/area bottom-right handle smaller, then larger.',
  'Click Zoom Out through its lower clamp and once more. Click Zoom In through its upper clamp and once more.',
  'Set View → Zoom on Scroll to Off, then On. Apply the same pixel-mode wheel input, deltaX 80 and deltaY 120, over an empty pane.',
  'Open Filter Tables. Search for books, toggle its eye off and on, and close the filter. Wheel-pan far away and click the out-of-view Show All button.',
  'Hover books in the sidebar and click its circular focus icon.',
  'Right-click an empty pane point near the right edge. Click New Table and rename it context_table. Compare pane-pointer and menu-item coordinates.',
  'Hide and show the minimap through View. Choose Dark, then Light through View → Theme.',
  'Drag inventory, press Meta+Z, then Meta+Shift+Z. Choose Actions → Export as → PNG, retain dialog defaults, click Export, and inspect the downloaded PNG header.',
]
const refs = [
  [
    [
      C + 'canvas.tsx:395-405,1672-1703',
      'controlled canvas, delayed initial fit, explicit options',
    ],
    [C + 'toolbar/toolbar.tsx:72-80', 'Show All'],
    [RF + ':1193-1209', 'fitView schedules the fit'],
    [XY + ':740-765', 'viewport bounds and clamp geometry'],
  ],
  [
    [C + 'canvas.tsx:360,1509,1697-1698', 'button and Shift snap state'],
    [
      C + 'canvas.tsx:596-673,1028-1320',
      'node changes persist geometry and rebuild controlled nodes',
    ],
    [XY + ':626-639,2062-2285', 'grid rounding, pointer conversion, node drag'],
  ],
  [
    [
      C + 'table-node/table-node-field.tsx:21-31,81-140,372-416',
      'field handle IDs and target activation',
    ],
    [C + 'canvas.tsx:801-867', 'connection dispatch and type check'],
    [
      'src/context/chartdb-context/chartdb-provider.tsx:1317-1360',
      'new relationship defaults',
    ],
    [RF + ':1734-1830', 'Handle starts and completes pointer connections'],
  ],
  [
    [
      C + 'relationship-edge/relationship-edge.tsx:216-304',
      'internal dimensions, nearest-side rule, smooth-step arguments',
    ],
    [
      C + 'relationship-edge/relationship-edge.tsx:315-331,376-395',
      'marker IDs and rendered path',
    ],
    [XY + ':1337-1395', 'smooth-step path geometry'],
  ],
  [
    [
      C + 'canvas.tsx:487-584',
      'selected table IDs raise and animate connected edges',
    ],
    [
      C + 'relationship-edge/relationship-edge.tsx:315-331,376-412',
      'edge selection owns pink stroke and marker variants',
    ],
    [
      RF + ':1563-1580,2794-2885',
      'node/edge selection and elevated edge rendering',
    ],
  ],
  [
    [
      C + 'canvas.tsx:1702,871-925,1028-1320',
      'delete key wiring and removal effects',
    ],
    [RF + ':1220-1235', 'global key handler deletes selected entities'],
    [RF + ':419-436', 'editable target guard'],
    [XY + ':845-854', 'input, contenteditable, and nokey recognition'],
  ],
  [
    [C + 'canvas.tsx:1699-1703', 'Full selection and all three modifiers'],
    [RF + ':1407-1549', 'capture-phase box selection'],
    [RF + ':1220-1235,1563-1580', 'multi-selection key state and toggles'],
    [XY + ':354-379', 'full containment test'],
  ],
  [
    [
      C + 'canvas.tsx:1028-1080,1100-1202',
      'visual and persisted member deltas',
    ],
    [C + 'canvas.tsx:748-798', 'debounced containment membership updates'],
    [
      'src/lib/utils/area-utils.ts:15-78',
      'full table containment and area priority',
    ],
    [XY + ':2062-2285', 'pointer drag and graph-space conversion'],
  ],
  [
    [C + 'table-node/table-node.tsx:464-471', 'horizontal table resizer'],
    ['src/lib/domain/db-table.ts:13-15', '224 and 450 width limits'],
    [C + 'note-node/note-node.tsx:161-168', '200 × 150 note minimum'],
    [C + 'area-node/area-node.tsx:162-167', '100 × 100 area minimum'],
    [RF + ':4639-4778,4810-4815', 'resize controls produce node changes'],
    [XY + ':3149-3240,3318-3520', 'resize geometry and constraints'],
  ],
  [
    [C + 'canvas.tsx:1683-1684', '0.1 and 5 limits'],
    [C + 'toolbar/toolbar.tsx:55-62', '200ms zoom buttons'],
    [RF + ':503-526', 'zoom helpers call pan/zoom'],
    [XY + ':2875-3030', 'D3 zoom scale extent'],
  ],
  [
    [
      'src/context/local-config-context/local-config-provider.tsx:22-24,68-70',
      'pan default and persistence',
    ],
    [
      'src/pages/editor-page/top-navbar/menu/menu.tsx:400-418',
      'setting controls',
    ],
    [C + 'canvas.tsx:1696', 'panOnScroll option'],
    [RF + ':1283-1372', 'scroll options and defaults'],
    [XY + ':2689-2740,2908-2958', 'pan wheel scaling and handler choice'],
  ],
  [
    [
      C + 'canvas-filter/canvas-filter.tsx:134-163',
      'search filters the filter tree',
    ],
    [
      C + 'canvas-filter/filter-item-actions.tsx:136-195',
      'eye toggles canvas visibility',
    ],
    [C + 'canvas.tsx:710-743', 'filter-triggered fit'],
    [
      C + 'hooks/use-is-lost-in-canvas.tsx:7-91',
      'viewport-end visibility check',
    ],
    [C + 'show-all-button.tsx:22-30', 'recovery fit'],
    [RF + ':2010-2035', 'render culling uses the viewport'],
  ],
  [
    [
      'src/pages/editor-page/side-panel/tables-section/table-list/table-list-item/table-list-item-header/table-list-item-header.tsx:93-100,320-322',
      'focus icon entry',
    ],
    [
      'src/hooks/use-focus-on.ts:53-86',
      'selection and animated fit fixed at zoom 1',
    ],
    [RF + ':1193-1209', 'fit scheduling'],
    [XY + ':740-765', 'viewport transform'],
  ],
  [
    [
      C + 'canvas-context-menu.tsx:69-104,299-303',
      'menu item click coordinates create the table',
    ],
    ['src/hooks/use-update-table.ts:12-31', 'one-second name save debounce'],
    [RF + ':548-564', 'screenToFlowPosition reads pane bounds and viewport'],
    [XY + ':632-639', 'coordinate conversion'],
  ],
  [
    [
      'src/pages/editor-page/top-navbar/menu/menu.tsx:395-398,443-482',
      'minimap and theme menu actions',
    ],
    [
      'src/context/local-config-context/local-config-provider.tsx:18-20,48-51,65-67,80-85',
      'defaults and local settings',
    ],
    [C + 'canvas.tsx:1674,1869-1881', 'effective theme and minimap rendering'],
    [RF + ':4537-4630', 'MiniMap reads node and viewport state'],
  ],
  [
    [
      'src/context/keyboard-shortcuts-context/keyboard-shortcuts-provider.tsx:23-37',
      'keyboard dispatch',
    ],
    [
      'src/context/history-context/history-provider.tsx:64-69,274-286,384-413',
      'replay state changes',
    ],
    [
      'src/dialogs/export-image-dialog/export-image-dialog.tsx:31-60,168-173',
      'PNG dialog defaults and export action',
    ],
    [
      'src/context/export-image-context/export-image-provider.tsx:39-47,69-100,254-302',
      'current viewport rasterization and actual download',
    ],
    [RF + ':528-531', 'React Flow state access for export'],
  ],
]
function describe(id, o) {
  switch (id) {
    case 'S1':
      return `The sample imports ${o.importedTables} tables and ${o.importedRelationships} relationships. The completed fixture also has two areas, two notes, and one view with two dependencies. Show All settles at zoom ${o.fitViewport.zoom}.`
    case 'S2':
      return (
        o.trials
          .map(
            (t) =>
              `${t.mode}: ${xy(t.before)} → ${xy(t.after)}${t.moved === false ? ' with no translation' : ''}.`
          )
          .join(' ') +
        ' Toggle and active-drag Shift endpoints are multiples of 20 in graph space. Authors is selected before each trial and loses selection after the position update, as recorded in selectedBefore and selectedAfter.'
      )
    case 'S3':
      return `One relationship is created between the two char(2) fields. Its cardinality defaults to ${o.created[0].sourceCardinality} → ${o.created[0].targetCardinality}. Imported DBML relationships retain their own cardinality. The markers are circles containing 1 or N.`
    case 'S4':
      return `The relationship changes sides from ${o.before.sourceSide} → ${o.before.targetSide} to ${o.after.sourceSide} → ${o.after.targetSide}. Both the SVG path and marker variants change. ChartDB minimizes the distance among four side pairs, rather than comparing node centers.`
    case 'S5':
      return `Selecting books raises connected edges to z-index 1 and animates them. Relationship strokes stay gray. Clicking the relationship selects it, changes its stroke to pink, and changes its marker variants. The selected table has z-index ${o.tableZ}.`
    case 'S6':
      return `Both Backspace and Delete remove inventory on the canvas. Undo restores it. Neither key removes the table while the Filter input has focus, nor a note while its textarea has focus. Input text changes according to ordinary text editing. ${o.trials.length} key/target observations are recorded.`
    case 'S7':
      return (
        o.clickTrials
          .map(
            (t) =>
              `${t.key}: selected ${JSON.stringify(t.selected)}${t.contextMenu?.length ? ', with a context menu' : ''}.`
          )
          .join(' ') +
        ` Full box: ${JSON.stringify(o.fullBox)}. Partial box: ${JSON.stringify(o.partialBox)}. Control-click is interpreted by macOS Chromium as a context click in this run, despite Control being configured as a multi-selection key.`
      )
    case 'S8':
      return `Catalog moves by ${xy(o.delta)} graph units. All ${o.members.length} member tables receive the same delta. Nonmember positions are recorded separately. The area's base z-index is −10.`
    case 'S9':
      return (
        o.trials
          .map(
            (t) =>
              `${t.kind}: ${size(t.before)} → ${size(t.smaller)} → ${size(t.larger)}.`
          )
          .join(' ') +
        ' Table height stays fixed; its horizontal width is constrained to 224–450. Note minimum is 200 × 150; area minimum is 100 × 100. No explicit upper size limit is supplied for notes or areas.'
      )
    case 'S10':
      return `The minimum is ${o.minimum}, and another Zoom Out leaves ${o.below}. The maximum is ${o.maximum}, and another Zoom In leaves ${o.above}.`
    case 'S11':
      return (
        o.trials
          .map(
            (t) =>
              `Zoom on Scroll ${t.setting}: viewport ${JSON.stringify(t.before)} → ${JSON.stringify(t.after)}; document scroll ${xy(t.windowScroll)}.`
          )
          .join(' ') + ' Off means pan-on-scroll. On means wheel zoom.'
      )
    case 'S12':
      return `Typing books narrows the filter tree without hiding the diagram. The eye toggle hides books. The reference calls fit after filter changes, although the measured transform may stay the same when outer bounds do not change. The far-away viewport renders ${o.lostRenderedNodes} nodes; Show All restores zoom ${o.recoveredViewport.zoom}.`
    case 'S13':
      return `The focus icon selects ${JSON.stringify(o.selected)} and changes zoom from ${o.beforeViewport.zoom} to ${o.afterViewport.zoom}. It centers books at 1×. Clicking the row label alone opens its details; the focus icon is the tested entry point.`
    case 'S14':
      return `The pane pointer is ${xy(o.pointer)} screen pixels. The created table is at ${xy(o.created)} graph coordinates. The trusted menu-input receipt records the actual input coordinates and click-time DOM transform. mappingDeltaGraph records the residual between the created position and the estimate from that rendered transform. Exact subpixel agreement with React Flow's internal camera is unverified. The handler uses the menu item's click coordinates${o.menuChoice ? `, ${xy(o.menuChoice.itemClick)}` : ''}, so the creation point can differ from the original context-click point when the menu is repositioned near a window edge.`
    case 'S15':
      return `Minimap presence changes to ${o.hidden} after Hide and to ${o.shown} after Show. The root class becomes ${JSON.stringify(o.dark)} in Dark and ${JSON.stringify(o.light)} in Light. Paired screenshots record both themes.`
    case 'S16':
      return `Inventory moves ${xy(o.before)} → ${xy(o.moved)}. Undo restores ${xy(o.undone)}, and redo restores ${xy(o.redone)}. The downloaded ${o.image.signature} is ${o.image.width} × ${o.image.height} pixels, ${o.image.byteLength} bytes. Defaults are 4×, patterned, and opaque. Export captures the current canvas viewport, not the full graph bounds.`
  }
}
const scenarios = []
for (let n = 1; n <= 16; n++) scenarios.push(await json(`S${n}`))
const lines = [
  '# ChartDB reference for Schema Studio',
  '',
  `ChartDB commit \`${sources.commit}\`, outside Flow at \`${sources.checkout}\`. The lockfile installs React Flow ${sources.reactFlow} and xyflow system ${sources.xyflowSystem}. Capture: ${run.capturedAt}, ${run.platform}/${run.architecture}, ${run.browser}, ${run.viewport.width} × ${run.viewport.height} CSS pixels, DPR ${run.devicePixelRatio}.`,
  '',
  "This is the reference half of Plan 121. It makes no Schema Studio or Flow parity claim. [README.md](README.md) documents the commands. [Source hashes](results/sources.json) bind these citations to the installed checkout and lockfile. ChartDB paths below are relative to that checkout. React Flow citations refer to the shipped, readable ESM runtime under node_modules, not Flow's older imported research artifacts.",
  '',
  '## Fixture and evidence boundary',
  '',
  'The real UI entry is an empty PostgreSQL diagram, then Actions → Import → DBML. The editable Monaco input receives apps/shared/schema-studio/sample-schema.dbml. The import path is src/pages/editor-page/top-navbar/menu/menu.tsx:180-211 → src/dialogs/common/import-database/import-database.tsx:90-180,287-295 → src/dialogs/import-database-dialog/import-database-dialog.tsx:63-139 → src/lib/dbml/dbml-import/dbml-import.ts:372-426. It adds the parsed entities to ChartDB state and IndexedDB, then the controlled React Flow canvas measures and renders them at src/pages/editor-page/canvas/canvas.tsx:343-405,596-673,1672-1704.',
  '',
  'Both areas and all ten memberships, both original notes, and bestsellers with dependencies on books and order_items are created through UI controls. No requested canvas-only element is missing. The areas are placed apart so automatic containment does not reassign members between overlapping groups. [fixture.json](results/fixture.json) records the completed fixture; [import.json](results/import.json) records the imported schema before canvas-only additions.',
  '',
  'The production path is browser input → ChartDB state/history → React Flow node and edge changes → geometry, DOM transforms, SVG paths, and marker definitions. The test path in scenarios.spec.mjs builds the fixture once, captures storageState including IndexedDB, and reloads that fixture in a fresh browser context for each scenario. This initialization restores persistence directly; every scenario action then uses browser mouse, keyboard, wheel, or editable-control events. Evaluation reads DOM and read-only IndexedDB transactions. A one-shot pointer observer records the trusted context-menu input and its click-time viewport. It does not mutate React state or call private app functions.',
  '',
  "Before/after states contain graph positions, CSS-pixel rectangles, sizes, node selection, node and edge wrapper z-indices, endpoint coordinates and sides, marker URLs, settings, and persistence records. DOM lists contain only rendered nodes; persistence records are not proof of rendered output. Readings wait past the app's documented debounce or animation boundaries. These are settled-state captures, not frame-order, performance, or in-drag publication proofs.",
  '',
  '## Settings and defaults',
  '',
  'Source-defined defaults are labeled separately from exercised behavior. The JSON version is [settings.json](results/settings.json).',
  '',
  '| Setting | Value | Origin and source | Runtime boundary |',
  '| --- | --- | --- | --- |',
  ...settings.settings.map(
    (s) =>
      `| ${s.name} | ${JSON.stringify(s.value).replaceAll('|', '\\|')} | ${s.origin}; \`${s.source}\` | ${s.evidenceBoundary} |`
  ),
  '',
  "New pointer-created relationships default to one → one at src/context/chartdb-context/chartdb-provider.tsx:1317-1348. The 14 DBML relationships include many → one and one → one. MarkerDefinitions draws a circle and the text 1 or N at src/pages/editor-page/canvas/marker-definitions.tsx:9-71. These are not crow's-foot glyphs.",
  '',
  '## Scenarios',
  '',
]
for (let n = 1; n <= 16; n++) {
  const s = scenarios[n - 1],
    id = `S${n}`,
    testLine = spec.findIndex((l) => l.includes(`await scenario('${id}'`)) + 1
  lines.push(
    `### ${id}: ${s.title}`,
    '',
    `Steps: ${steps[n - 1]}`,
    '',
    `Observed outcome: ${s.status === 'observed' ? describe(id, s.outcome) : `Unverified. ${s.error}`}`,
    '',
    `Evidence: [${id}.json](results/${id}.json), [light screenshot](results/screenshots/${id}-light.png), [dark screenshot](results/screenshots/${id}-dark.png). Test entry: \`scenarios.spec.mjs:${testLine}\`.`,
    '',
    'Production locations:',
    '',
    ...refs[n - 1].map(([p, why]) => `- \`${p}\`: ${why}.`),
    ''
  )
}
lines.push(
  '## Conformity and deviations',
  '',
  `Reference-conforming: ${scenarios
    .filter((s) => s.status === 'observed')
    .map((s) => s.id)
    .join(
      ', '
    )} have real-browser records. The exercised options, geometry, selection, deletion, area movement, size limits, zoom limits, settings, history, and download are reference observations at the pinned versions. Source/runtime agreement establishes only these bounded reference facts.`,
  '',
  'Intentionally different test setup: each scenario reloads the same UI-built persistence snapshot in a fresh context. Groups are separated for stable membership. This avoids cumulative scenario changes and overlapping-area priority affecting later captures. It does not test import and history as one continuous editing session. The one-time star request is dismissed after its 30-second timer at src/pages/editor-page/editor-page.tsx:30,50-65.',
  '',
  'Unverified comparison: all Flow and Schema Studio conformity remains open. No Flow browser suite ran, no implementation was changed, and no comparison trace was written outside this authorized folder. The reference differs from some Plan 121 assumptions: markers are circular 1/N badges, edge-side choice minimizes side-pair distance, new relations default one-to-one, table selection leaves connected strokes gray, Control-click has a macOS context-menu effect, and context-menu creation uses the menu-item click. Whether Schema Studio intentionally differs must be decided against its own browser evidence.',
  '',
  "Unverified variants: Firefox, Safari, Windows/Linux shortcuts, mobile/touch, pinch zoom, Space panning, canvas double-click zoom, input SELECT/contenteditable/nokey deletion exemptions, all relationship-validation cases, schema-based filtering, nested/overlapping-area priority, upper bounds for note/area sizes, and JPG/SVG export were not exercised. Their source defaults do not constitute runtime coverage. Shift snapping is tested after drag activation; Shift held before pointer-down also activates selection and is covered by S7's selection path.",
  '',
  ...scenarios
    .filter((s) => s.status !== 'observed')
    .map((s) => `Unverified ${s.id}: ${s.error}`),
  `Verification boundary: ${verificationBoundary} A temporary copy runs bun run verify --focused because this checkout has no browser-skip CLI. This is not full-suite, integration, collector, or release acceptance.`,
  ''
)
await writeFile(new URL('REFERENCE.md', import.meta.url), lines.join('\n'))
