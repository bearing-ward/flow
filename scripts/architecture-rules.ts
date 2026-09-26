import ts from 'typescript'

const browserGlobals = new Set([
  'cancelAnimationFrame',
  'document',
  'Element',
  'HTMLElement',
  'localStorage',
  'navigator',
  'Node',
  'PointerEvent',
  'requestAnimationFrame',
  'ResizeObserver',
  'sessionStorage',
  'window',
])

const getModuleSpecifier = (node: ts.Node): string | undefined => {
  if (
    (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
    node.moduleSpecifier !== undefined &&
    ts.isStringLiteral(node.moduleSpecifier)
  ) {
    return node.moduleSpecifier.text
  }

  if (
    ts.isCallExpression(node) &&
    node.expression.kind === ts.SyntaxKind.ImportKeyword &&
    node.arguments[0] !== undefined &&
    ts.isStringLiteral(node.arguments[0])
  ) {
    return node.arguments[0].text
  }

  return undefined
}

const importsApplicationSource = (specifier: string): boolean => {
  const normalized = specifier.replaceAll('\\', '/')

  return (
    normalized.startsWith('apps/') ||
    normalized.startsWith('@flow/vanilla') ||
    normalized.startsWith('@flow/vue') ||
    normalized.startsWith('@flow/foldkit') ||
    /(?:^|\/)apps\//u.test(normalized)
  )
}

const importsFrameworkAdapterSource = (specifier: string): boolean => {
  const parts = specifier.replaceAll('\\', '/').split('/')
  const flowIndex = parts.indexOf('@flow')
  const packagesIndex = parts.indexOf('packages')

  const aliasAdapter =
    flowIndex !== -1 &&
    parts[flowIndex + 2] === 'src' &&
    parts[flowIndex + 1] !== 'core' &&
    parts[flowIndex + 1] !== 'conformance'

  const relativeAdapter =
    packagesIndex !== -1 &&
    parts[packagesIndex + 2] === 'src' &&
    parts[packagesIndex + 1] !== 'core' &&
    parts[packagesIndex + 1] !== 'conformance'

  return aliasAdapter || relativeAdapter
}

const declaredNames = (source: ts.SourceFile): ReadonlySet<string> => {
  const names = new Set<string>()

  const collectBindingNames = (name: ts.BindingName): void => {
    if (ts.isIdentifier(name)) {
      names.add(name.text)

      return
    }

    for (const element of name.elements) {
      if (ts.isBindingElement(element)) {
        collectBindingNames(element.name)
      }
    }
  }

  const visit = (node: ts.Node): void => {
    if (
      (ts.isVariableDeclaration(node) ||
        ts.isParameter(node) ||
        ts.isFunctionDeclaration(node) ||
        ts.isClassDeclaration(node) ||
        ts.isImportClause(node) ||
        ts.isImportSpecifier(node) ||
        ts.isNamespaceImport(node)) &&
      node.name !== undefined
    ) {
      collectBindingNames(node.name)
    }

    ts.forEachChild(node, visit)
  }

  visit(source)

  return names
}

const isGlobalReference = (node: ts.Identifier): boolean => {
  const { parent } = node

  if (
    ts.isPropertyAccessExpression(parent) &&
    parent.name === node &&
    ts.isIdentifier(parent.expression) &&
    parent.expression.text === 'globalThis'
  ) {
    return true
  }

  return !(
    (ts.isPropertyAccessExpression(parent) && parent.name === node) ||
    (ts.isPropertyAssignment(parent) && parent.name === node) ||
    (ts.isPropertySignature(parent) && parent.name === node) ||
    (ts.isMethodDeclaration(parent) && parent.name === node) ||
    (ts.isPropertyDeclaration(parent) && parent.name === node) ||
    (ts.isBindingElement(parent) && parent.propertyName === node)
  )
}

const isGlobalThisReference = (node: ts.Identifier): boolean =>
  ts.isPropertyAccessExpression(node.parent) &&
  node.parent.name === node &&
  ts.isIdentifier(node.parent.expression) &&
  node.parent.expression.text === 'globalThis'

export interface ArchitectureSource {
  readonly path: string
  readonly text: string
}

export const findArchitectureViolations = (
  source: ArchitectureSource
): readonly string[] => {
  const violations: string[] = []

  const parsed = ts.createSourceFile(
    source.path,
    source.text,
    ts.ScriptTarget.Latest,
    true,
    source.path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  )

  const bindings = declaredNames(parsed)

  const visit = (node: ts.Node): void => {
    const line =
      parsed.getLineAndCharacterOfPosition(node.getStart(parsed)).line + 1

    const normalizedSourcePath = source.path.replaceAll('\\', '/')

    const specifier = getModuleSpecifier(node)

    if (specifier !== undefined) {
      const normalized = specifier.replaceAll('\\', '/')

      const packageSource = normalizedSourcePath.startsWith('packages/')
      const appSource = normalizedSourcePath.startsWith('apps/')

      const forbiddenAppImport =
        packageSource && importsApplicationSource(normalized)

      if (forbiddenAppImport) {
        violations.push(
          `${source.path}:${line} imports application code: ${specifier}`
        )
      }

      const importsAdapterSource =
        appSource && importsFrameworkAdapterSource(normalized)

      if (importsAdapterSource) {
        violations.push(
          `${source.path}:${line} imports framework adapter source directly: ${specifier}`
        )
      }

      if (
        (source.path.startsWith('packages/') ||
          source.path.startsWith('apps/')) &&
        (normalized.startsWith('research/artifacts/') ||
          normalized.startsWith('@research/artifacts/') ||
          /(?:^|\/)research\/artifacts\//u.test(normalized))
      ) {
        violations.push(
          `${source.path}:${line} imports immutable research evidence: ${specifier}`
        )
      }
    }

    if (
      normalizedSourcePath.startsWith('packages/core/src/') &&
      ts.isIdentifier(node) &&
      browserGlobals.has(node.text) &&
      (isGlobalThisReference(node) || !bindings.has(node.text)) &&
      isGlobalReference(node)
    ) {
      violations.push(
        `${source.path}:${line} references browser global ${node.text}`
      )
    }

    ts.forEachChild(node, visit)
  }

  visit(parsed)

  return violations
}
