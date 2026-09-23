import { BunRuntime, BunServices } from "@effect/platform-bun";
import { Effect, FileSystem, Path, Schema as S } from "effect";
import ts from "typescript";

const SourceSchema = S.Struct({
  commit: S.NonEmptyString,
  committedAt: S.NonEmptyString,
  paths: S.Array(S.NonEmptyString),
  repository: S.NonEmptyString,
});

const FileRecordSchema = S.Struct({
  calls: S.Array(S.Struct({ callee: S.String, line: S.Number })),
  declarations: S.Array(
    S.Struct({ name: S.String, kind: S.String, line: S.Number })
  ),
  imports: S.Array(S.Struct({ specifier: S.String, line: S.Number })),
  isTest: S.Boolean,
  lines: S.Number,
  objectId: S.NonEmptyString,
  path: S.NonEmptyString,
});

const InventorySchema = S.Struct({
  files: S.Array(FileRecordSchema),
  source: SourceSchema,
});

type FileRecord = typeof FileRecordSchema.Type;

const root = new URL("..", import.meta.url);

const parseableExtensions = new Set([".ts", ".tsx", ".js", ".jsx"]);

const hasExportModifier = (node: ts.Node): boolean =>
  ts.canHaveModifiers(node) &&
  (ts
    .getModifiers(node)
    ?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ??
    false);

const nodeName = (node: ts.Node): string | undefined => {
  if (
    ts.isFunctionDeclaration(node) ||
    ts.isClassDeclaration(node) ||
    ts.isInterfaceDeclaration(node) ||
    ts.isTypeAliasDeclaration(node) ||
    ts.isEnumDeclaration(node)
  ) {
    return node.name?.text;
  }

  return undefined;
};

const parseSource = (filePath: string, content: string, lineOffset = 0) => {
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );

  const declarations: { name: string; kind: string; line: number }[] = [];
  const imports: { specifier: string; line: number }[] = [];
  const calls: { callee: string; line: number }[] = [];

  const line = (node: ts.Node): number =>
    sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line +
    1 +
    lineOffset;

  const visit = (node: ts.Node): void => {
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      imports.push({ line: line(node), specifier: node.moduleSpecifier.text });
    }

    const name = nodeName(node);

    if (name !== undefined && hasExportModifier(node)) {
      declarations.push({
        kind: ts.SyntaxKind[node.kind],
        line: line(node),
        name,
      });
    }

    if (ts.isVariableStatement(node) && hasExportModifier(node)) {
      for (const declaration of node.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) {
          declarations.push({
            kind: "VariableDeclaration",
            line: line(declaration),
            name: declaration.name.text,
          });
        }
      }
    }

    if (ts.isCallExpression(node)) {
      calls.push({
        callee: node.expression.getText(sourceFile),
        line: line(node),
      });
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);

  return { calls, declarations, imports };
};

const parseSvelteScripts = (filePath: string, content: string) => {
  const declarations: { name: string; kind: string; line: number }[] = [];
  const imports: { specifier: string; line: number }[] = [];
  const calls: { callee: string; line: number }[] = [];

  const expression = /<script(?:\s[^>]*)?>(?<source>[\s\S]*?)<\/script>/gu;

  for (const match of content.matchAll(expression)) {
    const [, script] = match;

    if (script === undefined || match.index === undefined) {
      continue;
    }

    const lineOffset = content.slice(0, match.index).split("\n").length - 1;
    const parsed = parseSource(filePath, script, lineOffset);
    declarations.push(...parsed.declarations);
    imports.push(...parsed.imports);
    calls.push(...parsed.calls);
  }

  return { calls, declarations, imports };
};

type ParsedSource = ReturnType<typeof parseSource>;

const toTsv = (rows: readonly (readonly (string | number)[])[]): string =>
  `${rows.map((row) => row.join("\t")).join("\n")}\n`;

const program = Effect.gen(function* program() {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const rootPath = yield* path.fromFileUrl(root);

  const sourceConfigText = yield* fileSystem.readFileString(
    path.join(rootPath, "research", "UPSTREAM.json")
  );

  const sourceConfig = yield* S.decodeUnknownEffect(
    S.Struct({
      commit: S.NonEmptyString,
      paths: S.Array(S.NonEmptyString),
      repository: S.NonEmptyString,
    })
  )(JSON.parse(sourceConfigText));

  const artifactRoot = path.join(
    rootPath,
    "research",
    "artifacts",
    "xyflow",
    sourceConfig.commit
  );

  const source = yield* S.decodeUnknownEffect(SourceSchema)(
    JSON.parse(
      yield* fileSystem.readFileString(path.join(artifactRoot, "SOURCE.json"))
    )
  );

  const tree = yield* fileSystem.readFileString(
    path.join(artifactRoot, "FILES.tsv")
  );

  const files: FileRecord[] = [];

  for (const row of tree.trim().split("\n")) {
    const match = /^\d+\s+blob\s+(?<objectId>[a-f0-9]+)\t(?<path>.+)$/u.exec(
      row
    );

    if (match === null) {
      continue;
    }

    const [, objectId, relativePath] = match;

    if (objectId === undefined || relativePath === undefined) {
      continue;
    }

    const content = yield* fileSystem.readFileString(
      path.join(artifactRoot, relativePath)
    );

    const extension = path.extname(relativePath);

    let parsed: ParsedSource = { calls: [], declarations: [], imports: [] };

    if (extension === ".svelte") {
      parsed = parseSvelteScripts(relativePath, content);
    } else if (parseableExtensions.has(extension)) {
      parsed = parseSource(relativePath, content);
    }

    files.push({
      path: relativePath,
      objectId,
      lines: content.split("\n").length,
      ...parsed,
      isTest:
        /(?:^|\/)(?:tests?|e2e|cypress)\//u.test(relativePath) ||
        /\.(?:test|spec|cy)\.[^.]+$/u.test(relativePath),
    });
  }

  const inventory = yield* S.decodeUnknownEffect(InventorySchema)({
    files,
    source,
  });

  const outputRoot = path.join(rootPath, "research", "generated");
  yield* fileSystem.makeDirectory(outputRoot, { recursive: true });
  yield* fileSystem.writeFileString(
    path.join(outputRoot, "inventory.json"),
    `${JSON.stringify(inventory, null, 2)}\n`
  );
  yield* fileSystem.writeFileString(
    path.join(outputRoot, "DECLARATIONS.tsv"),
    toTsv([
      ["path", "line", "kind", "name"],
      ...files.flatMap((file) =>
        file.declarations.map((declaration) => [
          file.path,
          declaration.line,
          declaration.kind,
          declaration.name,
        ])
      ),
    ])
  );
  yield* fileSystem.writeFileString(
    path.join(outputRoot, "IMPORTS.tsv"),
    toTsv([
      ["path", "line", "specifier"],
      ...files.flatMap((file) =>
        file.imports.map((entry) => [file.path, entry.line, entry.specifier])
      ),
    ])
  );
  yield* fileSystem.writeFileString(
    path.join(outputRoot, "CALLS.tsv"),
    toTsv([
      ["path", "line", "callee"],
      ...files.flatMap((file) =>
        file.calls.map((call) => [file.path, call.line, call.callee])
      ),
    ])
  );
  yield* fileSystem.writeFileString(
    path.join(outputRoot, "TESTS.tsv"),
    toTsv([
      ["path", "lines"],
      ...files.flatMap((file) =>
        file.isTest ? [[file.path, file.lines]] : []
      ),
    ])
  );

  const roots = new Map<string, { files: number; lines: number }>();

  for (const file of files) {
    const rootName = file.path.split("/").slice(0, 2).join("/");
    const current = roots.get(rootName) ?? { files: 0, lines: 0 };
    roots.set(rootName, {
      files: current.files + 1,
      lines: current.lines + file.lines,
    });
  }

  const progress = yield* fileSystem.readFileString(
    path.join(rootPath, "research", "PROGRESS.md")
  );

  const summary = [
    "# Flow project summary",
    "",
    progress.trim(),
    "",
    "---",
    "",
    "## Research source inventory",
    "",
    `Commit: \`${source.commit}\``,
    "",
    "| Root | Files | Lines |",
    "| --- | ---: | ---: |",
    ...[...roots.entries()]
      .toSorted(([left], [right]) => left.localeCompare(right))
      .map(
        ([name, counts]) =>
          `| \`${name}\` | ${counts.files} | ${counts.lines} |`
      ),
    "",
    `Indexed declarations: ${files.reduce((count, file) => count + file.declarations.length, 0)}`,
    "",
    `Indexed call expressions: ${files.reduce((count, file) => count + file.calls.length, 0)}`,
    "",
    `Test and E2E files: ${files.filter((file) => file.isTest).length}`,
    "",
    "The call-expression table is a syntactic index, not a verified call graph. Human-reviewed traces resolve runtime ownership and indirect framework calls.",
    "",
  ].join("\n");

  yield* fileSystem.writeFileString(
    path.join(outputRoot, "SUMMARY.md"),
    summary
  );
  yield* Effect.log(`Indexed ${files.length} files into ${outputRoot}`);
});

BunRuntime.runMain(program.pipe(Effect.provide(BunServices.layer)));
