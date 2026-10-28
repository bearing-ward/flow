import { strictEqual } from 'node:assert'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'

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
    ]
  }

  if (host === undefined || kind === undefined) {
    return [file]
  }

  const unit = `${
    (host === 'vue'
      ? 'packages/vue/tests/ownership/'
      : 'apps/vanilla/tests/ownership/') + kind
  }.browser.test.ts`

  const oracles = unit.replace('.browser.test.ts', '-oracles.ts')

  return existsSync(file) ? [file, unit, oracles] : [unit, oracles]
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

const lines = (text: string): number =>
  text.split('\n').length - (text.endsWith('\n') ? 1 : 0)

const before = (file: string): string =>
  execFileSync('git', ['show', `${baseline}:${file}`], { encoding: 'utf-8' })

const expectedDeclarations = (file: string, text: string) => {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true)

  return source.statements.flatMap((statement) =>
    ts.isVariableStatement(statement)
      ? statement.declarationList.declarations.flatMap((declaration) =>
          declaration.initializer === undefined
            ? []
            : [
                {
                  name: declaration.name.getText(source),
                  value: normalizeAssertion(
                    declaration.initializer.getText(source)
                  ),
                },
              ]
        )
      : []
  )
}

let declarationCount = 0

for (const file of ownershipFiles.filter((candidate) =>
  candidate.endsWith('.e2e.ts')
)) {
  const current = destinations(file).flatMap((target) =>
    expectedDeclarations(target, readFileSync(target, 'utf-8'))
  )

  for (const expected of expectedDeclarations(file, before(file))) {
    strictEqual(
      current.some(
        (candidate) =>
          candidate.name === expected.name && candidate.value === expected.value
      ),
      true,
      `Changed expected table or constructor ${file}:${expected.name}`
    )
    declarationCount += 1
  }
}

const rows: string[] = []

let count = 0

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
    assertions(target, readFileSync(target, 'utf-8'), helpers).map(
      (assertion) => ({
        ...assertion,
        target,
      })
    )
  )

  for (const assertion of assertions(file, before(file))) {
    const target = candidates.find(
      (candidate) =>
        candidate.hash === assertion.hash &&
        candidate.scenario === assertion.scenario
    )

    strictEqual(
      target !== undefined,
      true,
      `Unmapped assertion ${file}:${assertion.line} ${assertion.text}`
    )

    if (target === undefined) {
      throw new Error('Missing assertion destination')
    }

    count += 1
    rows.push(
      `| A${String(count).padStart(4, '0')} | ${tick}B:${file}:${
        assertion.line
      }${tick} ${tick}${assertion.hash}${tick} ${assertion.text} | ${tick}${
        target.target
      }:${target.line}${tick} | ${
        target.target.includes('/tests/ownership/') ? 'U' : 'B'
      } |`
    )
  }
}

const walk = (directory: string): readonly string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = `${directory}/${entry.name}`

    if (entry.isDirectory()) {
      return walk(path)
    }

    return path.endsWith('.ts') ? [path] : []
  })

const currentFiles = [
  ...readdirSync('apps').flatMap((host) => {
    const directory = `apps/${host}/e2e`

    return existsSync(directory) ? walk(directory) : []
  }),
  ...walk('apps/shared-e2e'),
]

const beforeTotal = baselineFiles.reduce(
  (total, file) => total + lines(before(file)),
  0
)

const afterTotal = currentFiles.reduce(
  (total, file) => total + lines(readFileSync(file, 'utf-8')),
  0
)

const afterOwnership = currentFiles
  .filter((file) => file.includes('-ownership'))
  .reduce((total, file) => total + lines(readFileSync(file, 'utf-8')), 0)

strictEqual(
  afterOwnership <= 5500,
  true,
  'Ownership source exceeds 5,500 lines'
)

strictEqual(
  beforeTotal - afterTotal >= 13_000,
  true,
  'Total e2e source reduction is below 13,000 lines'
)

const fileRows = ownershipFiles.map(
  (file) =>
    `| ${tick}${file}${tick} | ${lines(before(file))} | ${
      existsSync(file) ? lines(readFileSync(file, 'utf-8')) : 0
    } |`
)

const generated = [
  '<!-- ownership-audit:start -->',
  '',
  `Baseline B is commit ${tick}${baseline}${
    tick
  }. The audit reads that Git version, never imported research artifacts.`,
  '',
  '| Ownership file | Before lines | After lines |',
  '| --- | ---: | ---: |',
  ...fileRows,
  `| **Total** | **18484** | **${afterOwnership}** |`,
  '',
  `All host e2e and shared-e2e TypeScript files total ${
    beforeTotal
  } before and ${afterTotal} after, a net reduction of ${
    beforeTotal - afterTotal
  } lines. The count includes helpers and contracts once and excludes binary snapshots. No e2e code was rehomed to another e2e path.`,
  '',
  'Every baseline ownership assertion is mapped below. U means an identical literal assertion in a direct adapter unit test. B means a retained browser assertion. Nested literal expected values are included in each assertion hash, with whitespace, quote style and trailing separators normalized. The audit also checks every top-level expected table and constructor against its baseline literal source. Matching requires the same scenario family and fixture entry, so an identical generic assertion in another case cannot satisfy the map. Repeated generated instances share their source assertion. No assertion is deliberately dropped. Chromium-backed unit tests do not establish trusted pointer-capture acceptance.',
  '',
  '| ID | Baseline assertion | Current assertion | Boundary |',
  '| --- | --- | --- | --- |',
  ...rows,
  '',
  '<!-- ownership-audit:end -->',
].join('\n')

const trace = readFileSync(tracePath, 'utf-8')

const unformatted = trace.replace(
  /<!-- ownership-audit:start -->[\s\S]*<!-- ownership-audit:end -->/u,
  generated
)

const updated = execFileSync(
  'bun',
  ['run', 'oxfmt', '--stdin-filepath', tracePath],
  { input: unformatted, encoding: 'utf-8' }
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
  `Mapped ${count} assertions and ${declarationCount} expected declarations; ownership ${afterOwnership} lines; total e2e ${
    afterTotal
  } lines, down ${beforeTotal - afterTotal}.\n`
)
