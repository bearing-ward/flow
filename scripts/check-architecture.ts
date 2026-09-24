import { BunRuntime, BunServices } from "@effect/platform-bun";
import { Effect, FileSystem, Path } from "effect";

import { findArchitectureViolations } from "./architecture-rules.ts";

const rootUrl = new URL("../", import.meta.url);

const fixtureChecks = (): readonly string[] => {
  const fixtures = [
    {
      expected: "pass",
      path: "packages/core/src/domain/allowed.ts",
      text: 'import { FlowNodeSchema } from "../flow.schema.ts";\nexport { FlowNodeSchema };',
    },
    {
      expected: "pass",
      path: "packages/core/src/domain/allowed-local-document.ts",
      text: 'const document = { nodes: [] };\nexport const count = document.nodes.length;',
    },
    {
      expected: "fail",
      path: "packages/core/src/domain/forbidden-app.ts",
      text: 'import "../../../apps/vanilla/src/public.ts";',
    },
    {
      expected: "fail",
      path: "packages/core/src/domain/forbidden-browser.ts",
      text: "export const title = window.document.title;",
    },
    {
      expected: "fail",
      path: "apps/vanilla/src/forbidden-research.ts",
      text: 'import "../../../../research/artifacts/xyflow/example.ts";',
    },
    {
      expected: "pass",
      path: "apps/vanilla/src/allowed-browser.ts",
      text: "export const title = globalThis.document.title;",
    },
  ] as const;

  const failures: string[] = [];
  for (const fixture of fixtures) {
    const violations = findArchitectureViolations(fixture);
    const matchesExpectation = fixture.expected === "pass"
      ? violations.length === 0
      : violations.length > 0;
    if (!matchesExpectation) {
      failures.push(`${fixture.path}: expected ${fixture.expected}, got ${violations.join("; ") || "no violations"}`);
    }
  }
  return failures;
};

const program = Effect.gen(function* checkArchitecture() {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const root = yield* path.fromFileUrl(rootUrl);
  const fixtureFailures = fixtureChecks();

  if (fixtureFailures.length > 0) {
    return yield* Effect.die(new Error(`Architecture rule fixtures failed:\n${fixtureFailures.join("\n")}`));
  }

  const files = yield* Effect.tryPromise({
    try: async () => {
      const found: string[] = [];
      const sourceGlob = new Bun.Glob("{packages,apps}/**/src/**/*.{ts,tsx,js,jsx}");
      for await (const file of sourceGlob.scan({ cwd: root })) found.push(file);
      return found.sort();
    },
    catch: (error) => error,
  });

  const violations: string[] = [];
  for (const file of files) {
    const sourcePath = path.join(root, file);
    const text = yield* fileSystem.readFileString(sourcePath);
    violations.push(...findArchitectureViolations({ path: file, text }));
  }

  if (violations.length > 0) {
    return yield* Effect.die(new Error(`Architecture boundaries failed:\n${violations.join("\n")}`));
  }

  yield* Effect.log(`Verified architecture boundaries across ${files.length} production source files; all six rule fixtures passed`);
});

BunRuntime.runMain(program.pipe(Effect.provide(BunServices.layer)));
