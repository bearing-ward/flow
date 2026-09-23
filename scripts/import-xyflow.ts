import { BunRuntime, BunServices } from "@effect/platform-bun";
import { Effect, FileSystem, Path, Schema as S } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";

const UpstreamSourceSchema = S.Struct({
  commit: S.NonEmptyString,
  paths: S.Array(S.NonEmptyString),
  repository: S.NonEmptyString,
});

type UpstreamSource = typeof UpstreamSourceSchema.Type;

const root = new URL("..", import.meta.url);

const program = Effect.scoped(
  Effect.gen(function* program() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const process = yield* ChildProcessSpawner.ChildProcessSpawner;
    const rootPath = yield* path.fromFileUrl(root);
    const sourcePath = path.join(rootPath, "research", "UPSTREAM.json");
    const sourceText = yield* fileSystem.readFileString(sourcePath);

    const source = yield* S.decodeUnknownEffect(UpstreamSourceSchema)(
      JSON.parse(sourceText)
    );

    const temporaryDirectory = yield* fileSystem.makeTempDirectoryScoped({
      prefix: "flow-xyflow-",
    });

    const checkout = path.join(temporaryDirectory, "xyflow");

    const cloneExitCode = yield* process.exitCode(
      ChildProcess.make(
        "git",
        [
          "clone",
          "--filter=blob:none",
          "--no-checkout",
          source.repository,
          checkout,
        ],
        { stderr: "inherit", stdout: "inherit" }
      )
    );

    if (cloneExitCode !== 0) {
      return yield* Effect.die(
        new Error(`git clone failed with exit code ${cloneExitCode}`)
      );
    }

    const checkoutExitCode = yield* process.exitCode(
      ChildProcess.make("git", ["checkout", "--detach", source.commit], {
        cwd: checkout,
        stderr: "inherit",
        stdout: "inherit",
      })
    );

    if (checkoutExitCode !== 0) {
      return yield* Effect.die(
        new Error(`git checkout failed with exit code ${checkoutExitCode}`)
      );
    }

    const resolvedCommit = (yield* process.string(
      ChildProcess.make("git", ["rev-parse", "HEAD"], { cwd: checkout })
    )).trim();

    if (resolvedCommit !== source.commit) {
      return yield* Effect.die(
        new Error(
          `Expected xyflow commit ${source.commit}, received ${resolvedCommit}`
        )
      );
    }

    const artifactRoot = path.join(
      rootPath,
      "research",
      "artifacts",
      "xyflow",
      source.commit
    );

    if (yield* fileSystem.exists(artifactRoot)) {
      yield* fileSystem.remove(artifactRoot, { recursive: true });
    }

    yield* fileSystem.makeDirectory(artifactRoot, { recursive: true });

    for (const relativePath of source.paths) {
      const from = path.join(checkout, relativePath);
      const to = path.join(artifactRoot, relativePath);
      yield* fileSystem.makeDirectory(path.dirname(to), { recursive: true });
      yield* fileSystem.copy(from, to, {
        overwrite: true,
        preserveTimestamps: true,
      });
    }

    const fileList = yield* process.string(
      ChildProcess.make(
        "git",
        ["ls-tree", "-r", "HEAD", "--", ...source.paths],
        { cwd: checkout }
      )
    );

    const committedAt = (yield* process.string(
      ChildProcess.make("git", ["log", "-1", "--format=%cI"], { cwd: checkout })
    )).trim();

    const metadata: UpstreamSource & { committedAt: string } = {
      ...source,
      committedAt,
    };

    yield* fileSystem.writeFileString(
      path.join(artifactRoot, "SOURCE.json"),
      `${JSON.stringify(metadata, null, 2)}\n`
    );
    yield* fileSystem.writeFileString(
      path.join(artifactRoot, "FILES.tsv"),
      fileList
    );
    yield* Effect.log(`Imported xyflow ${source.commit} into ${artifactRoot}`);
  })
);

BunRuntime.runMain(program.pipe(Effect.provide(BunServices.layer)));
