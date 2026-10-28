# Native keyboard reconnect callback test boundary

2026-10-02. This clarifies the existing approved 086 reconnect admission amendment. It authorizes only two new native test expected-count expressions, keeping keyboard lifecycle classification unchanged.

Primary read the actual mounted assertions in `apps/foldkit/e2e/interaction-lifecycle.e2e.ts:3026,4289-4313`, the core keyboard completion at `packages/foldkit/src/graph.ts:1345-1388`, the canonical lifecycle mapping at `packages/foldkit/src/application.ts:1690-1743,1790-1858`, and separately constructed reducer controls at `packages/foldkit/src/application.test.ts:1080-1170` in the isolated native-parity-acceptance checkout.

Actual keyboard ActivateHandle completion publishes one edge-reconnect change but has no explicit release phase. The existing lifecycle mapping classifies session disappearance as cancel and excludes proposal callbacks in that phase. The approved amendment explicitly preserves this keyboard cancelled classification. Therefore the two newly authored canonical onReconnect callback counts must expect zero for keyboard and one for pointer. Preserve the actual public semantic change count of one, exact colon-containing edge/opposite endpoint identity, accepted/controlled acknowledgement, unchanged viewport, denied completion, setter cancellation, fresh retry, terminal counts and existing cancelled outcomes. Do not change production callbacks, classify keyboard release differently, or delete any native/reducer assertion.

The failed actual 24-case receipt, log SHA256 `e98a4184d456ca10df0a8526f7a135f4c05f6d1212749e3487e587fb7c0c4932`, remains immutable. It passed sixteen cases, including all eight resize and eight pointer admission controls; eight keyboard cases failed only the newly incorrect canonical proposal count. Rerun all 24 after this bounded correction. Report actual pass separately from broader callback parity.

## Conformity and deviations

Current admission and actual semantic proposals are the bounded test target. Keyboard cancelled canonical lifecycle and zero onReconnect callback are an intentionally preserved current policy, with broader 071 callback parity still open. No new source or member acceptance follows from this expectation correction.
