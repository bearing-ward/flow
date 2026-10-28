import { deepStrictEqual, strictEqual } from 'node:assert'
import { readFileSync, readdirSync } from 'node:fs'

import ts from 'typescript-api'

import { representativeCombination } from '../../apps/shared-e2e/representative-cases.ts'

const arraySize = (
  expression: ts.Expression,
  definitions: ReadonlyMap<string, ts.Expression>
): number => {
  if (
    ts.isParenthesizedExpression(expression) ||
    ts.isAsExpression(expression) ||
    ts.isSatisfiesExpression(expression)
  ) {
    return arraySize(expression.expression, definitions)
  }

  if (
    ts.isCallExpression(expression) &&
    ts.isPropertyAccessExpression(expression.expression) &&
    expression.expression.name.text === 'entries'
  ) {
    return arraySize(expression.expression.expression, definitions)
  }

  if (ts.isConditionalExpression(expression)) {
    return Math.max(
      arraySize(expression.whenTrue, definitions),
      arraySize(expression.whenFalse, definitions)
    )
  }

  if (ts.isArrayLiteralExpression(expression)) {
    return expression.elements.length
  }

  const definition = ts.isIdentifier(expression)
    ? definitions.get(expression.text)
    : undefined

  if (definition !== undefined) {
    return arraySize(definition, definitions)
  }

  throw new Error(
    `Matrix audit needs an explicit array axis: ${expression.getText()}`
  )
}

const readMatrixSizes = (file: string): readonly (readonly number[])[] => {
  const matrices: (readonly number[])[] = []
  const contents = readFileSync(file, 'utf-8')

  const source = ts.createSourceFile(
    file,
    contents,
    ts.ScriptTarget.Latest,
    true
  )

  const definitions = new Map<string, ts.Expression>()

  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) {
      continue
    }

    for (const declaration of statement.declarationList.declarations) {
      if (
        ts.isIdentifier(declaration.name) &&
        declaration.initializer !== undefined
      ) {
        definitions.set(declaration.name.text, declaration.initializer)
      }
    }
  }

  const visit = (node: ts.Node, loops: readonly ts.ForOfStatement[]): void => {
    const currentLoops = ts.isForOfStatement(node) ? [...loops, node] : loops

    if (
      ts.isCallExpression(node) &&
      node.expression.getText(source) === 'representativeCombination'
    ) {
      const [indexes] = node.arguments

      if (indexes === undefined || !ts.isArrayLiteralExpression(indexes)) {
        throw new Error(`Missing matrix indexes in ${file}`)
      }

      const sizes = indexes.elements.map((index) => {
        const loop = currentLoops.find((candidate) => {
          if (!ts.isVariableDeclarationList(candidate.initializer)) {
            return false
          }

          const [declaration] = candidate.initializer.declarations

          return (
            declaration !== undefined &&
            ts.isArrayBindingPattern(declaration.name) &&
            declaration.name.elements[0]?.getText(source) ===
              index.getText(source)
          )
        })

        if (loop === undefined) {
          throw new Error(`Unbound matrix index in ${file}`)
        }

        return arraySize(loop.expression, definitions)
      })

      matrices.push(sizes)
    }

    ts.forEachChild(node, (child) => visit(child, currentLoops))
  }

  visit(source, [])

  return matrices
}

const matrixSizes = new Map<string, readonly number[]>()

let families = 0

for (const host of ['vanilla', 'vue']) {
  const directory = `apps/${host}/e2e`

  for (const name of readdirSync(directory).filter((file) =>
    file.endsWith('.e2e.ts')
  )) {
    for (const sizes of readMatrixSizes(`${directory}/${name}`)) {
      matrixSizes.set(sizes.join(','), sizes)
      families += 1
    }
  }
}

strictEqual(families, 21, 'Update the matrix inventory when families change')

for (const sizes of matrixSizes.values()) {
  let all: number[][] = [[]]

  for (const size of sizes) {
    all = all.flatMap((row) =>
      Array.from({ length: size }, (_, value) => [...row, value])
    )
  }

  const kept = all.filter(representativeCombination)

  strictEqual(kept.length, 1 + sizes.reduce((sum, size) => sum + size - 1, 0))
  deepStrictEqual(
    kept[0],
    sizes.map(() => 0)
  )

  for (const [axis, size] of sizes.entries()) {
    deepStrictEqual(
      [...new Set(kept.map((row) => row[axis]))].toSorted(
        (a, b) => (a ?? 0) - (b ?? 0)
      ),
      Array.from({ length: size }, (_, value) => value)
    )
  }
}

process.stdout.write(
  `Every axis value is retained across ${families} browser matrix families.\n`
)
