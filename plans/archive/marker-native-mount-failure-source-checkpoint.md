# Marker continuation: installed Mount failure boundary

Read-only source checkpoint, 2026-10-02, main `841be137e253cf19c665269eaaa79edc19abf3c3`. This grants no marker executor, source change or design revision. The retained continuation and nested configuration approvals remain authoritative.

Root inspected the installed accepted087 checkout at `/Users/richardmcandrews/.codex/worktrees/typed-data-factory/flow`. Public `node_modules/foldkit/dist/html/index.d.ts:61` defines Html as VNode or null. `node_modules/foldkit/dist/mount/index.d.ts:45-49` defines the public MountAction as name, optional args, and an element/view-state function returning a Stream. The public mount documentation at `:111-159` describes real element ownership, replay/live dispatch and asynchronous interruption finalizers.

The actual OnMount implementation at `node_modules/foldkit/dist/html/index.js:948-1039` captures Runtime context, installs insert/postpatch/destroy hooks and forks a scoped action. Its runMount boundary at `:1017-1028` catches the Stream Cause and prints an unhandled-failure diagnostic. Thus this inspected OnMount Stream failure path does not by itself establish a whole Runtime crash. Conversely, console reporting does not establish Flow's proposed marker policy: disable the failed definition's URL, release its owned resources, retain other definitions and keep the accepted graph unchanged. A thrown synchronous view/content callback and a failed asynchronous Mount Stream are separate boundaries and require separate tests.

Do not rely on internal VNode hooks, private runtime frames, console interception or presumed inherited callback ownership to declare containment. Any future registry implementation must show the actual public path for reporting an asynchronous caller Mount failure to the definition owner, including generation guards and cleanup; or stop for a bounded design decision with the actual missing public capability. An injected HtmlBuilder wrapper alone does not prove ownership of resources built through a separately imported builder. No restriction on arbitrary SVG children/resources has been approved by this checkpoint.

## Conformity and deviations

The installed public Mount path and its source failure handling are observed. Custom marker failure containment, independent definition survival, actual Runtime graph state, native SVG URL removal, cleanup ordering and replay/dispose behavior remain unverified. This source observation corrects an unproven assumption of inevitable OnMount Runtime failure and does not close any marker or MiniMap cell.
