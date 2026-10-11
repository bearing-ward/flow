# Independent amendment for the 091 observer binding

2026-10-02. Verdict: APPROVE this exact lexical correction on merit, subject to root's separate review and explicit release. The v2 proposal alone contains a naming conflict with the installed quality rules. The approved design should be released only with this bounded correction. This is not source or runtime acceptance.

Root identified the naming conflict after reading the already-written v2 cold review. I independently inspected the actual installed rule and repository configuration, and confirmed the two lexical bindings in the full v2 proposed code. The existing review was preserved without edits at 12,258 bytes, SHA256 `e1c03d05ae2a6abdf4dd3805d4aa519ceba60eb364342faff418da7c50975702`. The complete v2 design stays immutable at 46,217 bytes, SHA256 `e8972619bbd333f5573e2cabecd0f4ac312d02857c406b77f5267ea420c0ab50`. This adjacent receipt records the later observation honestly; it does not overwrite the earlier verdict.

## Confirmed quality conflict

Proposal `plans/live-options-foldkit-reconnect-control-layer-repair-design-v2.md:228` declares outer parameter `requireCompetitor`. The nested browser callback at `:246` destructures another binding with the same name, used at `:268`. Installed W `node_modules/ultracite/config/oxlint/core/index.mjs:172` sets `no-shadow` to error. W `oxlint.config.ts:24` extends core and its complete overrides/rules contain no waiver for this binding or native test file. W is `/Users/richardmcandrews/.codex/worktrees/live-connection-options/flow`.

The installed core config is 25,900 bytes, SHA256 `8ebaba6a54872bc3351fa59a50dd54d4aaf47e9d9fe5841c74587e0051b8e439`. Actual repository config is 6,251 bytes, SHA256 `652fd1609671badfed88888fdc6858c15199d3421d3da020c73bee540adff2f9`. No lint or quality gate was run; this is a source-based rule conflict. Its fix has S effort, LOW risk and HIGH confidence. Passing either previous coverage finding does not remove this separate naming conflict.

## Exact approved proposed-byte correction

Only in the proposed `apps/foldkit/e2e/live-connection-options.e2e.ts`, alias the serialized field while destructuring it inside the browser callback, then use that alias for its single inner branch:

```diff
-  const proof = await anchor.evaluate((control, { center, requireCompetitor }) => {
+  const proof = await anchor.evaluate((control, { center, requireCompetitor: mustObserveCompetitor }) => {
@@
-    if (requireCompetitor) {
+    if (mustObserveCompetitor) {
       const competitor = competitorEdges?.[0]
```

The snippet is intentionally bounded to the callback declaration and the branch that immediately reads competitorEdges. Keep the outer serialized argument `{ center: point, requireCompetitor }` unchanged. Keep the outer `if (requireCompetitor)` that asserts the returned proof unchanged. Keep both true call sites, every real input action, all counts, geometry/labels/stacking assertions, preview/proposal/terminal assertions, seventeen original bodies and eight additive cases unchanged. Do not introduce suppression or quality policy changes.

I reconstructed the entire v2 proposed native file in memory, applied exactly these two substitutions, and hashed the complete result:

| Complete proposed native file | Bytes | Lines | SHA256 |
| --- | --- | --- | --- |
| Original immutable v2 proposal | 46,544 | 1,490 | `afaa16a4342ea4afdbfba956bde22e7f1c96276130f1594edabb55925eed495f` |
| V2 plus this exact alias correction | 46,571 | 1,490 | `6d6cecf5e67bbdb19861ce768b4af231498a7cd7e0caba3723b6d1485cd8c066` |

The two replacements preserve the transmitted property name and boolean value; only the inner local variable changes. The complete production graph proposal remains SHA256 `004ead24c763acbc9e1db18a4b1b9b29b826d2bbac85f3509d688a40f04bc79c`, and public test-host proposal remains `b942c51e8d01df202825136356fd9b62954e10fe610ca29822a4bb624aeb6cd8`. All first-review coverage findings remain closed. This is a mechanical correction with unchanged test strength, not a new production or test design.

## Release and evidence boundary

Root may judge this explicit amendment with the immutable v2 proposal and cold review. Release must name both exact documents and the resulting native proposed hash. SAME091 must preserve the full existing freeze, apply only the approved three-file changes plus this exact lexical adjustment, and follow all v2 local/shared gates, STOP rules and final SOURCE review requirements. Subsequent formatter-only normalization remains subject to v2's narrowly stated preservation/receipt rules; arbitrary helper rewrites or assertion changes are not authorized.

I ran read/search/hash and in-memory reconstruction only, and wrote only this requested separate plans receipt. No source/E/config, compiler, build, quality/architecture gate, browser, runtime probe, shared process/port, Git operation or executor action ran. Formal SOURCE rounds remain zero. All original51 and proposed8 native/member cells remain OPEN; root retains the 091 shared lease. Design approval does not establish repaired input, lifecycle, focused/archive acceptance or future runtime success.

## Conformity and deviations

Conforming target: the required real-competitor observation and public lifecycle proof remain exactly as reviewed in v2, while the callback respects the actual configured no-shadow rule.

Intentionally different: the inner callback's local boolean is named mustObserveCompetitor. The serialized public-test argument property and outer requireCompetitor parameter remain unchanged. There is no behavior or test-boundary change.

Unverified: actual future quality/type/architecture/test/native/archive/focused results and source acceptance. This lexical approval cannot replace any v2 gate, independent reproduction or SOURCE review.
