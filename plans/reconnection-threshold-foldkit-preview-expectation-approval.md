# Foldkit reconnect preview expectation approval

Reviewed2026-10-02, bounded new-test mechanical correction only. Actual candidate `packages/foldkit/src/graph.ts:338` declares interaction event `onReconnectPreview`; `packages/foldkit/src/application.ts:1646-1649` maps reconnection progress to this exact event. The first eight newly authored threshold cases fail at `apps/foldkit/e2e/interaction-lifecycle.e2e.ts:5204-5212` solely because they expect `onReconnectProgress`. Root read the entire new native test through bounded slices, canonical source mapping and first raw failure.

Authorize replacing only the three newly authored expected strings `onReconnectProgress` with `onReconnectPreview` in this threshold matrix. Do not rename production events, change old tests, adjust event counts/order/terminal labels, or loosen graph/capture/preview/metadata/viewport checks. Preserve first eight failures/artifacts before editing, then re-run these exact eight cases. Their healthy release assertions were not reached in the first run and therefore remain unverified.

First log `resume-093-foldkit-threshold-first.log` SHA2562e5eae0844dd4f6cb9d362d57a24d2a6edc664073f5371b49e9b6e83788d96ff. Original new test file SHA256d1f0ed1c98b8867724c0b79e3f5b1abb3076751325dfe94e7b29e755ceaae3bd. Actual applicationf0a9ca62a2d417d2b1d83e0be1463dbe2394745f52b1ee134bb1b7341c9886da, graph02c43ff21d60803073172f052c29b51d32cdb5881a38788fbc9090d29827bf8e.

Full raw callback payloads and six per-frame public/DOM/capture receipts remain additive requirements. All zero/diagonal/cancellation/disposal/owner/eligibility/current-target/fresh retry and combined gates remain required. This is not formal SOURCE acceptance or a production API policy change.
