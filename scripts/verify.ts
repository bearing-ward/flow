import { BunRuntime, BunServices } from "@effect/platform-bun";
import { Effect } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";

const checks = [
  ["research inventory", ["bun", "run", "research:inventory"]],
  ["research trace citations", ["bun", "run", "research:check-traces"]],
  ["typecheck", ["bun", "run", "typecheck"]],
  ["tests", ["bun", "run", "test"]],
  ["build", ["bun", "run", "build"]],
  ["browser", ["bun", "run", "test:browser"]],
] as const;

const program = Effect.gen(function* program() {
  const process = yield* ChildProcessSpawner.ChildProcessSpawner;

  for (const [name, [command, ...arguments_]] of checks) {
    yield* Effect.log(`Starting ${name}`);

    const exitCode = yield* process.exitCode(
      ChildProcess.make(command, arguments_, {
        stderr: "inherit",
        stdout: "inherit",
      })
    );

    if (exitCode !== 0) {
      return yield* Effect.die(
        new Error(`${name} failed with exit code ${exitCode}`)
      );
    }
  }
});

BunRuntime.runMain(program.pipe(Effect.provide(BunServices.layer)));
