import ts from 'typescript-api'

const callName = (node: ts.Node) =>
  ts.isCallExpression(node) && ts.isIdentifier(node.expression)
    ? node.expression.text
    : ''

const bodyOf = (node: ts.CallExpression) => {
  const callback = node.arguments.at(-1)

  return callback &&
    (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback)) &&
    ts.isBlock(callback.body)
    ? callback.body
    : undefined
}

// Extract setup and mount expressions only. Shared Playwright bodies own all
// gestures and assertions. Imported evidence is never rewritten on disk.
export const componentFixtureSource = (
  text: string,
  line: number,
  utility = false
) => {
  const source = ts.createSourceFile(
    'fixture.tsx',
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  )

  const mountCall = (node: ts.Node): ts.CallExpression | undefined => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.expression.getText(source) === 'cy' &&
      node.expression.name.text === 'mount'
    ) {
      return node
    }

    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression)
    ) {
      return mountCall(node.expression.expression)
    }

    return undefined
  }

  const setup = (body: ts.Block) => {
    const lines: string[] = []

    for (const statement of body.statements) {
      if (ts.isExpressionStatement(statement)) {
        const mount = mountCall(statement.expression)

        if (mount) {
          lines.push(`${mount.getText(source)};`)

          return lines.join('\n')
        }
      }

      lines.push(statement.getText(source))
    }

    return ''
  }

  let selected: string | undefined

  const visit = (
    block: ts.SourceFile | ts.Block,
    parents: readonly string[]
  ) => {
    const lexical = ts.isBlock(block)
      ? block.statements.flatMap((item) =>
          ts.isVariableStatement(item) || ts.isFunctionDeclaration(item)
            ? [item.getText(source)]
            : []
        )
      : []

    const hooks = block.statements.flatMap((statement) => {
      if (
        !ts.isExpressionStatement(statement) ||
        !ts.isCallExpression(statement.expression) ||
        callName(statement.expression) !== 'beforeEach'
      ) {
        return []
      }

      const body = bodyOf(statement.expression)

      return body ? [setup(body)] : []
    })

    for (const statement of block.statements) {
      if (
        !ts.isExpressionStatement(statement) ||
        !ts.isCallExpression(statement.expression)
      ) {
        continue
      }

      const call = statement.expression
      const body = bodyOf(call)

      if (!body) {
        continue
      }

      if (callName(call) === 'describe') {
        visit(body, [...parents, ...lexical, ...hooks])
      }

      if (
        callName(call) === 'it' &&
        source.getLineAndCharacterOfPosition(call.getStart(source)).line + 1 ===
          line
      ) {
        selected = [
          ...parents,
          ...lexical,
          ...hooks,
          utility
            ? body.statements.map((item) => item.getText(source)).join('\n')
            : setup(body),
        ].join('\n')
      }
    }
  }

  visit(source, [])

  if (selected === undefined || (!utility && !selected.includes('cy.mount('))) {
    throw new Error(`Missing component mount at upstream line ${line}`)
  }

  const declarations = source.statements.flatMap((statement) => {
    if (
      ts.isExpressionStatement(statement) &&
      callName(statement.expression) === 'describe'
    ) {
      return []
    }

    if (
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      statement.moduleSpecifier.text.startsWith('@cypress/')
    ) {
      return []
    }

    return [statement.getText(source)]
  })

  return ts.transpileModule(
    `${utility ? "import { expect } from 'chai';\n" : ''}${declarations.join('\n')}\nexport default function mountReference(cy) {\n${selected}\n}`,
    {
      compilerOptions: {
        jsx: ts.JsxEmit.ReactJSX,
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ESNext,
      },
    }
  ).outputText
}
