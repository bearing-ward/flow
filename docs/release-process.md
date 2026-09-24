# Release dry run

Run `bun run release:dry-run` to build and pack `@flow/core` and `@flow/vanilla`, install the tarballs into a temporary consumer, typecheck and mount that consumer in Chromium, and print a JSON manifest. The command removes its temporary directory on success or failure. It does not publish packages, create tags, or change package visibility.

The dry run does not draft a package changelog because these private `0.0.0` packages have no release history. The manifest records the archive names and versions as input to a later reviewed release note.

The dry run asserts that `effect`, `@effect/platform-bun`, and `@effect/platform-browser` resolve to the workspace's exact `4.0.0-rc.116` pin. Foldkit 0.163.0 requires the same exact Effect and browser-platform peers. Keep the platform packages aligned when changing the Effect release.

The Flow packages remain private development packages at version `0.0.0`. This project is personal, so the dry-run manifest records Flow's own license status as `deferred`; it does not claim license clearance or approval to publish. Before public release, the maintainer must choose the package license and notices, set public package metadata, select a package version, and review the generated archives.

For a first release, use semantic versions for package API compatibility. Keep the saved-document envelope version separate from package versions. The envelope's version `1` describes the persisted format; change it only with a documented migration. During the pre-1.0 phase, record breaking public API changes in migration notes before the next release. This repository has not yet published a version or established release tags.
