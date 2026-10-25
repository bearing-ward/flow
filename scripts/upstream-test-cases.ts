import { readdir, readFile } from 'node:fs/promises'

import ts from 'typescript-api'

export const upstreamRoot =
  'research/artifacts/xyflow/3d35b57317576b0916c0bfeaaedd573aaacc2839'

export interface UpstreamCase {
  readonly id: string
  readonly upstream: string
  readonly title: string
  readonly phase: 126 | 127 | 128
  readonly guards: {
    readonly upstream: string
    readonly condition: string
    readonly reason: string
  }[]
}

const suites = [
  { directory: 'tests/playwright/e2e', suffix: '.spec.ts', phase: 126 },
  { directory: 'examples/react/cypress/e2e', suffix: '.cy.ts', phase: 127 },
  { directory: 'examples/react/cypress/components', suffix: '', phase: 128 },
] as const

export const enumerateSourceCases = ({
  path,
  text,
  phase,
  offset = 0,
}: {
  readonly path: string
  readonly text: string
  readonly phase: UpstreamCase['phase']
  readonly offset?: number
}): readonly UpstreamCase[] => {
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true)
  const cases: UpstreamCase[] = []

  const location = (node: ts.Node): string =>
    `${path}:${source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1}`

  const visit = (
    node: ts.Node,
    describes: readonly string[],
    parentCase?: UpstreamCase
  ): void => {
    let owner = parentCase
    let nested = describes

    if (ts.isCallExpression(node)) {
      const name = node.expression.getText(source)
      const [title, reason] = node.arguments

      const hasBody = node.arguments.some(
        (argument) =>
          ts.isArrowFunction(argument) || ts.isFunctionExpression(argument)
      )

      if (
        title !== undefined &&
        (ts.isStringLiteralLike(title) || ts.isTemplateExpression(title))
      ) {
        const titleText = ts.isStringLiteralLike(title)
          ? title.text
          : title.getText(source)

        if (/^(?:test\.)?describe(?:\.(?:only|skip))?$/u.test(name)) {
          nested = [...describes, titleText]
        }

        if (/^(?:test|it)(?:\.(?:only|skip))?$/u.test(name) && hasBody) {
          owner = {
            id: `UP-${phase}-${String(offset + cases.length + 1).padStart(3, '0')}`,
            upstream: location(node),
            title: [...describes, titleText].join(' > '),
            phase,
            guards: [],
          }
          cases.push(owner)
        }
      }

      if (name === 'test.skip' && !hasBody && owner !== undefined) {
        owner.guards.push({
          upstream: location(node),
          condition: title?.getText(source) ?? '',
          reason:
            reason !== undefined && ts.isStringLiteralLike(reason)
              ? reason.text
              : '',
        })
      }
    }

    ts.forEachChild(node, (child) => visit(child, nested, owner))
  }

  visit(source, [])

  return cases
}

export const enumerateUpstreamCases = async (): Promise<
  readonly UpstreamCase[]
> => {
  const phases = await Promise.all(
    suites.map(async (suite) => {
      const entries = await readdir(`${upstreamRoot}/${suite.directory}`, {
        recursive: true,
      })

      const paths = entries
        .filter(
          (path) => /\.[jt]sx?$/u.test(path) && path.endsWith(suite.suffix)
        )
        .toSorted()

      const sources = await Promise.all(
        paths.map(async (relative) => {
          const path = `${suite.directory}/${relative}`
          const text = await readFile(`${upstreamRoot}/${path}`, 'utf-8')

          return { path, text }
        })
      )

      const cases: UpstreamCase[] = []

      for (const source of sources) {
        cases.push(
          ...enumerateSourceCases({
            ...source,
            phase: suite.phase,
            offset: cases.length,
          })
        )
      }

      return cases
    })
  )

  return phases.flat()
}
