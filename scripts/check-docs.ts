import { BunRuntime, BunServices } from "@effect/platform-bun";
import { Effect, FileSystem, Path } from "effect";
import ts from "typescript";

const rootUrl = new URL("../", import.meta.url);
const linkPattern = /!?\[[^\]]*\]\((?<target>[^)]+)\)/gu;
const codePattern = /```(?<language>[\w-]+)(?:\s+file=(?<file>[^\s]+))?\n(?<source>[\s\S]*?)\n```/gu;

const decodeTarget = (target: string): string => {
  const trimmed = target.trim().replace(/^<|>$/gu, "");
  return decodeURIComponent(trimmed);
};

const slug = (heading: string): string => heading
  .toLocaleLowerCase("en-US")
  .replace(/[`*_~]/gu, "")
  .replace(/[^\p{L}\p{N}\s-]/gu, "")
  .trim()
  .replace(/\s+/gu, "-");

const program = Effect.gen(function* checkDocumentation() {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const root = yield* path.fromFileUrl(rootUrl);
  const markdownFiles = yield* Effect.tryPromise({
    try: async () => {
      const found: string[] = [];
      const glob = new Bun.Glob("{docs,examples}/**/*.md");
      for await (const file of glob.scan({ cwd: root })) found.push(file);
      return found.sort();
    },
    catch: (error) => error,
  });

  const failures: string[] = [];
  for (const relativeFile of markdownFiles) {
    const source = yield* fileSystem.readFileString(path.join(root, relativeFile));
    const resolvedTargets = new Map<string, string>();

    for (const match of source.matchAll(linkPattern)) {
      const rawTarget = match.groups?.target;
      if (rawTarget === undefined) continue;
      const target = decodeTarget(rawTarget);
      if (/^(?:https?:|mailto:|#)/iu.test(target)) continue;
      const [rawPath = "", anchor] = target.split("#", 2);
      if (rawPath === "") {
        if (anchor !== undefined) resolvedTargets.set("#", anchor);
        continue;
      }
      const destination = path.resolve(path.dirname(path.join(root, relativeFile)), rawPath);
      if (!(yield* fileSystem.exists(destination))) {
        failures.push(`${relativeFile}: missing link target ${rawPath}`);
        continue;
      }
      if (anchor?.startsWith("L") !== true && anchor !== undefined && rawPath.endsWith(".md")) {
        resolvedTargets.set(destination, anchor);
      }
    }

    for (const [destination, anchor] of resolvedTargets) {
      const targetPath = destination === "#" ? path.join(root, relativeFile) : destination;
      if (!(yield* fileSystem.exists(targetPath))) continue;
      const targetText = yield* fileSystem.readFileString(targetPath);
      const headings = [...targetText.matchAll(/^#{1,6}\s+(.+?)\s*#*$/gmu)]
        .map((heading) => slug(heading[1] ?? ""));
      if (!headings.includes(anchor)) {
        failures.push(`${relativeFile}: missing heading anchor #${anchor} in ${path.relative(root, targetPath)}`);
      }
    }

    for (const match of source.matchAll(codePattern)) {
      const language = match.groups?.language;
      const code = match.groups?.source ?? "";
      const snippetFile = match.groups?.file;
      if (language === "ts" || language === "tsx") {
        const compiled = ts.transpileModule(code, {
          compilerOptions: { target: ts.ScriptTarget.Latest },
          fileName: `${relativeFile}.snippet.${language}`,
          reportDiagnostics: true,
        });
        for (const diagnostic of compiled.diagnostics ?? []) {
          failures.push(`${relativeFile}: invalid ${language} snippet: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, " ")}`);
        }
      }
      if (snippetFile !== undefined) {
        const [snippetPath = "", lineAnchor] = decodeTarget(snippetFile).split("#", 2);
        const sourcePath = path.resolve(path.dirname(path.join(root, relativeFile)), snippetPath);
        if (!(yield* fileSystem.exists(sourcePath))) {
          failures.push(`${relativeFile}: missing snippet source ${snippetPath}`);
          continue;
        }
        const sourceText = yield* fileSystem.readFileString(sourcePath);
        const lines = sourceText.split("\n");
        const bounds = lineAnchor?.match(/^L(?<start>\d+)-L(?<end>\d+)$/u);
        if (bounds === null || bounds === undefined) {
          failures.push(`${relativeFile}: snippet source must use #Lstart-Lend: ${snippetFile}`);
          continue;
        }
        const start = Number(bounds.groups?.start);
        const end = Number(bounds.groups?.end);
        const extracted = lines.slice(start - 1, end).join("\n");
        if (start < 1 || end < start || end > lines.length || extracted.trim() !== code.trim()) {
          failures.push(`${relativeFile}: code snippet does not match ${snippetPath} lines ${start}-${end}`);
        }
      }
    }
  }

  if (failures.length > 0) {
    return yield* Effect.die(new Error(`Documentation checks failed:\n${failures.join("\n")}`));
  }
  yield* Effect.log(`Checked ${markdownFiles.length} Markdown files, local links, TypeScript snippets, and source-backed examples`);
});

BunRuntime.runMain(program.pipe(Effect.provide(BunServices.layer)));
