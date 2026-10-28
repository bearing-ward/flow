import { strictEqual } from 'node:assert'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

import ts from 'typescript-api'

const baseline = '730895fcd24ec8d54e33cd022ebac72166a16f0c'

const tracePath = 'research/traces/180-ownership-suite-reduction.md'

const tick = String.fromCodePoint(96)

const baselineFiles = execFileSync(
  'git',
  ['ls-tree', '-r', '--name-only', baseline],
  { encoding: 'utf-8' }
)
  .trim()
  .split('\n')
  .filter((file) => /^apps\/(?:[^/]+\/e2e|shared-e2e)\/.*\.ts$/u.test(file))

const ownershipFiles = baselineFiles.filter((file) =>
  file.includes('-ownership')
)

const destinations = (file: string): readonly string[] => {
  const match =
    /^apps\/(?<host>vanilla|vue)\/e2e\/(?<kind>gesture|renderer|viewport)-ownership\.(?:e2e\.ts)$/u.exec(
      file
    )

  const host = match?.groups?.host
  const kind = match?.groups?.kind

  if (file === 'apps/vue/e2e/connection-threshold.e2e.ts') {
    return [
      'apps/vue/e2e/connection-threshold.e2e.ts',
      'packages/vue/tests/ownership/connection.browser.test.ts',
      'packages/vue/tests/ownership/connection-oracles.ts',
    ].filter(existsSync)
  }

  if (host === undefined || kind === undefined) {
    return [file].filter(existsSync)
  }

  const unit = `${
    (host === 'vue'
      ? 'packages/vue/tests/ownership/'
      : 'apps/vanilla/tests/ownership/') + kind
  }.browser.test.ts`

  const oracles = unit.replace('.browser.test.ts', '-oracles.ts')

  return [file, unit, oracles].filter(existsSync)
}

const normalizeAssertion = (expression: string): string => {
  const source = ts.createSourceFile(
    'assertion.ts',
    expression,
    ts.ScriptTarget.Latest,
    true
  )

  const tokens: { kind: ts.SyntaxKind; text: string }[] = []

  const visit = (node: ts.Node): void => {
    const children = node.getChildren(source)

    if (children.length === 0 && node.kind !== ts.SyntaxKind.EndOfFileToken) {
      tokens.push({
        kind: node.kind,
        text: ts.isStringLiteral(node)
          ? JSON.stringify(node.text)
          : node.getText(source),
      })
    }

    for (const child of children) {
      visit(child)
    }
  }

  visit(source)

  return tokens
    .values()
    .filter(
      (token, index) =>
        token.kind !== ts.SyntaxKind.CommaToken ||
        ![
          ts.SyntaxKind.CloseBraceToken,
          ts.SyntaxKind.CloseBracketToken,
          ts.SyntaxKind.CloseParenToken,
        ].includes(tokens[index + 1]?.kind ?? ts.SyntaxKind.Unknown)
    )
    .map((token) => token.text)
    .toArray()
    .join('')
}

const registrationKey = (
  node: ts.CallExpression,
  source: ts.SourceFile
): string | undefined => {
  const callee = node.expression.getText(source)
  const [title, callback] = node.arguments

  if (
    (callee !== 'test' && callee !== 'it' && !callee.startsWith('it.each(')) ||
    title === undefined ||
    callback === undefined ||
    (!ts.isStringLiteralLike(title) && !ts.isTemplateExpression(title))
  ) {
    return undefined
  }

  const label = ts.isTemplateExpression(title)
    ? title.head.text +
      title.templateSpans
        .map(
          (span) => `$${span.expression.getText(source)}${span.literal.text}`
        )
        .join('')
    : title.text

  let fixtureName = ''

  const visit = (child: ts.Node): void => {
    if (
      ts.isCallExpression(child) &&
      ts.isPropertyAccessExpression(child.expression) &&
      ts.isIdentifier(child.expression.expression) &&
      ['fixture', 'harness'].includes(child.expression.expression.text) &&
      fixtureName === ''
    ) {
      fixtureName = child.expression.name.text
    }

    ts.forEachChild(child, visit)
  }

  visit(callback)

  return `${label}:${fixtureName}`
}

const helperScenarios = (file: string): ReadonlyMap<string, string> => {
  const text = readFileSync(file, 'utf-8')
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true)
  const result = new Map<string, string>()

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const key = registrationKey(node, source)
      const [, callback] = node.arguments

      if (key !== undefined && callback !== undefined) {
        const collect = (child: ts.Node): void => {
          if (
            ts.isCallExpression(child) &&
            ts.isIdentifier(child.expression) &&
            child.expression.text.startsWith('assert')
          ) {
            result.set(child.expression.text, key)
          }

          if (
            ts.isCallExpression(child) &&
            ts.isPropertyAccessExpression(child.expression) &&
            ts.isIdentifier(child.expression.expression) &&
            child.expression.expression.text === 'oracle'
          ) {
            result.set(child.expression.name.text, key)
          }

          ts.forEachChild(child, collect)
        }

        collect(callback)
      }
    }

    ts.forEachChild(node, visit)
  }

  visit(source)

  return result
}

const assertionScenario = (
  node: ts.Node,
  source: ts.SourceFile,
  helpers: ReadonlyMap<string, string>
): string => {
  let current: ts.Node | undefined = node

  while (current !== undefined) {
    if (ts.isVariableDeclaration(current)) {
      const key = helpers.get(current.name.getText(source))

      if (key !== undefined) {
        return key
      }
    }

    if (ts.isCallExpression(current)) {
      const key = registrationKey(current, source)

      if (key !== undefined) {
        return key
      }
    }

    current = current.parent
  }

  throw new Error(
    `Assertion has no registered scenario: ${node.getText(source)}`
  )
}

const assertions = (
  file: string,
  text: string,
  helpers: ReadonlyMap<string, string> = new Map()
) => {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true)

  const result: {
    hash: string
    line: number
    text: string
    scenario: string
  }[] = []

  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      /^expect[.(]/u.test(node.getText(source)) &&
      !(
        ts.isPropertyAccessExpression(node.parent) &&
        node.parent.expression === node
      ) &&
      !(ts.isCallExpression(node.parent) && node.parent.expression === node)
    ) {
      const expression = node.getText(source)
      result.push({
        scenario: assertionScenario(node, source, helpers),
        hash: createHash('sha256')
          .update(normalizeAssertion(expression))
          .digest('hex')
          .slice(0, 16),
        line:
          source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
        text: expression
          .replaceAll(/\s+/gu, ' ')
          .slice(0, 150)
          .replaceAll('|', '&#124;'),
      })
    }

    ts.forEachChild(node, visit)
  }

  visit(source)

  return result
}

const lines = (text: string): number => text.split('\n').length - 1

const before = (file: string): string =>
  execFileSync('git', ['show', `${baseline}:${file}`], { encoding: 'utf-8' })

const roundOne = '7b5ba09c6155d74e9bc7cf832c14e4af182a3048'

const tracked = (revision?: string): readonly string[] =>
  execFileSync(
    'git',
    revision === undefined
      ? ['ls-files']
      : ['ls-tree', '-r', '--name-only', revision],
    { encoding: 'utf-8' }
  )
    .trim()
    .split('\n')

const read = (file: string, revision?: string): string =>
  revision === undefined
    ? readFileSync(file, 'utf-8')
    : execFileSync('git', ['show', `${revision}:${file}`], {
        encoding: 'utf-8',
      })

const counted = (file: string): boolean =>
  /^(?:apps\/[^/]+\/e2e\/|apps\/shared-e2e\/|apps\/[^/]+\/tests\/|packages\/[^/]+\/tests\/)/u.test(
    file
  )

const files = tracked().filter(existsSync)

const total = (revision?: string): number =>
  (revision === undefined ? files : tracked(revision))
    .filter(counted)
    .reduce((sum, file) => sum + lines(read(file, revision)), 0)

const srcTotal = (revision?: string): number =>
  (revision === undefined ? files : tracked(revision))
    .filter((file) => /^packages\/[^/]+\/src\/.*\.test\.ts$/u.test(file))
    .reduce((sum, file) => sum + lines(read(file, revision)), 0)

const caseCount = (file: string, revision?: string): number => {
  const source = ts.createSourceFile(
    file,
    read(file, revision),
    ts.ScriptTarget.Latest,
    true
  )

  const declarations = new Map(
    source.statements
      .filter(ts.isVariableStatement)
      .flatMap((statement) =>
        statement.declarationList.declarations.flatMap((declaration) =>
          declaration.initializer === undefined
            ? []
            : [
                [
                  declaration.name.getText(source),
                  declaration.initializer,
                ] as const,
              ]
        )
      )
  )

  const width = (node: ts.Expression): number => {
    if (
      ts.isAsExpression(node) ||
      ts.isSatisfiesExpression(node) ||
      ts.isParenthesizedExpression(node)
    ) {
      return width(node.expression)
    }

    if (ts.isArrayLiteralExpression(node)) {
      return node.elements.length
    }

    if (ts.isIdentifier(node)) {
      const value = declarations.get(node.text)

      if (value !== undefined) {
        return width(value)
      }
    }

    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === 'map'
    ) {
      return width(node.expression.expression)
    }

    if (
      ts.isPropertyAccessExpression(node) &&
      node.expression.getText(source) === 'oracle'
    ) {
      const oracle = file.replace('.browser.test.ts', '-oracles.ts')

      const oracleSource = ts.createSourceFile(
        oracle,
        read(oracle, revision),
        ts.ScriptTarget.Latest,
        true
      )

      for (const statement of oracleSource.statements.filter(
        ts.isVariableStatement
      )) {
        for (const declaration of statement.declarationList.declarations) {
          if (
            declaration.name.getText(oracleSource) === node.name.text &&
            declaration.initializer !== undefined
          ) {
            return width(declaration.initializer)
          }
        }
      }
    }

    throw new Error(`Cannot count case rows in ${file}: ${node.getText()}`)
  }

  let count = 0

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const name = node.expression.getText(source)

      if (name === 'it' || name === 'test' || name.startsWith('it.each(')) {
        let instances = 1

        if (ts.isCallExpression(node.expression)) {
          const [rows] = node.expression.arguments

          if (rows === undefined) {
            throw new Error(`Missing rows in ${file}`)
          }

          instances = width(rows)
        }

        let { parent } = node

        while (parent !== undefined) {
          if (ts.isForOfStatement(parent)) {
            instances *= width(parent.expression)
          }

          const { parent: nextParent } = parent

          parent = nextParent
        }

        count += instances
      }
    }

    ts.forEachChild(node, visit)
  }

  visit(source)

  return count
}

const ownershipTest = (file: string): boolean =>
  (file.includes('/tests/ownership/') && file.endsWith('.browser.test.ts')) ||
  file.endsWith('-ownership.e2e.ts')

const ownership = (revision?: string): readonly string[] =>
  (revision === undefined ? files : tracked(revision)).filter(ownershipTest)

const beforeCases = ownership(roundOne).reduce(
  (sum, file) => sum + caseCount(file, roundOne),
  0
)

const afterCases = ownership().reduce((sum, file) => sum + caseCount(file), 0)

const beforeTotal = total(roundOne)

const afterTotal = total()

const srcDelta = srcTotal() - srcTotal('main')

strictEqual(
  afterTotal <= 90_000,
  true,
  `Test source exceeds 90,000 lines: ${afterTotal}`
)

strictEqual(
  afterCases <= 100,
  true,
  `Ownership exceeds 100 cases: ${afterCases}`
)

strictEqual(
  srcDelta <= 1500,
  true,
  `Package src tests grew by ${srcDelta} lines`
)

const dropReason = (file: string): string => {
  if (file.includes('renderer-ownership')) {
    return 'Redundant renderer kind x lifecycle/fault channel x host-mode receipt combination; repeated full document, hook and Scope snapshots deliberately dropped. Renderer projection/geometry/currency and numeric-map cases remain.'
  }

  if (file.includes('gesture-ownership') && file.includes('/vue/')) {
    return 'Redundant callback phase x input route x controlled/disposal/recursive/successor combination; full event/document/resource snapshots deliberately dropped. Kept watcher, drain, completion, preview, selection and endpoint cases assert the listed outcomes only.'
  }

  if (file.includes('viewport-ownership') && file.includes('/vue/')) {
    return 'Redundant viewport callback phase x controlled/joined/error/scheduler combination; full callback receipts deliberately dropped. Request ownership, stale-frame replay, bounded acknowledgement and connection auto-pan cases remain.'
  }

  if (file.includes('gesture-ownership')) {
    return 'Redundant actor x terminal x threshold/continuation combination; complete document/preview/publication receipts deliberately dropped. Kept successor, Escape, stale-frame and matching-loss cases assert ownership outcomes.'
  }

  return 'Redundant residence x viewport/capture/document receipt combination; complete snapshots deliberately dropped. Kept connection auto-pan cases assert capture release, terminal reason and quiet disposal.'
}

const rows: string[] = []

let count = 0

let kept = 0

for (const file of [
  ...ownershipFiles.filter((candidate) => candidate.endsWith('.e2e.ts')),
  'apps/vue/e2e/connection-threshold.e2e.ts',
]) {
  const helpers = new Map(
    destinations(file)
      .filter((target) => target.endsWith('.browser.test.ts'))
      .flatMap((target) => [...helperScenarios(target)])
  )

  const candidates = destinations(file).flatMap((target) =>
    assertions(target, read(target), helpers).map((assertion) => ({
      ...assertion,
      target,
    }))
  )

  for (const assertion of assertions(file, before(file))) {
    const target = candidates.find(
      (candidate) =>
        candidate.hash === assertion.hash &&
        candidate.scenario.split(':').at(-1) ===
          assertion.scenario.split(':').at(-1)
    )

    count += 1

    if (target !== undefined) {
      kept += 1
    }

    rows.push(
      `| A${String(count).padStart(4, '0')} | ${tick}B:${file}:${assertion.line}${tick} ${tick}${assertion.hash}${tick} ${assertion.text} | ${target === undefined ? `D: ${dropReason(file)} See [kept cases and axes](#kept-cases-and-axes).` : `K: ${tick}${target.target}:${target.line}${tick}`} |`
    )
  }
}

const changedFiles = [
  ...new Set([
    ...tracked(roundOne).filter(
      (file) =>
        counted(file) &&
        (file.includes('ownership') || file.includes('input-ownership'))
    ),
    ...files.filter((file) => counted(file) && file.includes('ownership')),
  ]),
].toSorted()

const fileRows = changedFiles.map(
  (file) =>
    `| ${tick}${file}${tick} | ${tracked(roundOne).includes(file) ? lines(read(file, roundOne)) : 0} | ${existsSync(file) ? lines(read(file)) : 0} |`
)

const generated = [
  '<!-- ownership-audit:start -->',
  '',
  `Round 1 is ${tick}${roundOne}${tick}. Original assertion baseline B is ${tick}${baseline}${tick}. Read-only Git inventories count all tracked files under the requested directories, including non-TypeScript files and snapshots. No helper is excluded.`,
  '',
  `Test-directory lines: **${beforeTotal} to ${afterTotal}**. Ownership cases, including Foldkit and retained renderer e2e: **${beforeCases} to ${afterCases}**. Package src test-line delta against main: **${srcDelta}**.`,
  '',
  '| Ownership file | Round 1 lines | Round 2 lines |',
  '| --- | ---: | ---: |',
  ...fileRows,
  '',
  'K identifies an unchanged literal assertion in the same fixture family. D is an approved deliberate drop of redundant axis combinations and their full snapshot assertions. A kept partial outcome is not claimed to cover a deleted full snapshot. Every original source assertion has a row; repeated generated instances share that source assertion. Expected tables and fixture branches for dropped combinations were deleted rather than copied elsewhere.',
  '',
  `There are ${count} source assertions: ${kept} unchanged literals and ${count - kept} deliberate drops. The family table above names the kept cases and exactly which observations remain.`,
  '',
  '| ID | Original assertion | Round 2 disposition |',
  '| --- | --- | --- |',
  ...rows,
  '',
  '<!-- ownership-audit:end -->',
].join('\n')

const trace = readFileSync(tracePath, 'utf-8')

const updated = execFileSync(
  'bun',
  ['run', 'oxfmt', '--stdin-filepath', tracePath],
  {
    encoding: 'utf-8',
    input: trace.replace(
      /<!-- ownership-audit:start -->[\s\S]*<!-- ownership-audit:end -->/u,
      generated
    ),
  }
)

if (process.argv.includes('--write')) {
  writeFileSync(tracePath, updated)
} else {
  strictEqual(
    trace,
    updated,
    'Run bun research/traces/180-ownership-audit.ts --write'
  )
}

process.stdout.write(
  `Test-directory lines ${beforeTotal} -> ${afterTotal}; ownership cases ${beforeCases} -> ${afterCases}; src test delta ${srcDelta}; assertions ${count} (${kept} kept, ${count - kept} deliberately dropped).\n`
)
