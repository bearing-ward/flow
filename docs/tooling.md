# Code-quality tooling

Flow uses Ultracite with the Oxlint and Oxfmt toolchain. All four direct development dependencies use exact versions:

- `ultracite@7.12.0`
- `oxlint@1.85.0`
- `@oxlint/plugins@1.85.0`
- `oxfmt@0.70.0`

`oxlint.config.ts` extends the Ultracite core and Vitest presets. It also loads the vendored anti-slop generic and Effect plugins. `oxfmt.config.ts` uses the Ultracite Oxfmt preset. Both configurations ignore imported research evidence, generated research indexes, build output, agent directories, and the vendored plugin source.

## Commands

Use these read-only checks:

```sh
bun run lint
bun run format:check
bun run check
bunx ultracite doctor
```

`bun run check` runs both Ultracite checks. Use the write commands only when formatting or lint cleanup is the current task:

```sh
bun run lint:fix
bun run format
bun run fix
```

## Initial baseline

Ultracite Doctor reports eight passing setup checks with no warnings or failures. The first repository check found 465 lint errors across 18 owned files and formatting changes in 22 files after the generated configuration was normalized. The largest groups are readable-spacing, sorted-key, curly-brace, array-type, type-assertion-comment, generator-name, and Vitest findings.

The installation does not add `bun run check` to `bun run verify` yet. Clear the existing findings in a separate reviewed cleanup, run the formatter and lint fixer twice to prove stability, then add the read-only check to the complete gate.

## Anti-slop provenance

The anti-slop source is vendored at `tools/oxlint/anti-slop/`. Its `UPSTREAM.md` records the exact upstream commit and installed entry points. Update it through the installed `install-anti-slop` skill. Do not replace local source without reviewing upstream and preserving local changes.
