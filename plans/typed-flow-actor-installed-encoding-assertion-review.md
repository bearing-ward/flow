# Installed encoding assertion review

Reviewed 2026-10-02 against main 841be137 and the isolated 089 candidate. This permits one fixture correction, not source acceptance.

Actual `tests/consumer/typed-flow-actor.runtime.ts` SHA256 415d6c1e219b88804c85d9b528cc32b2f879917f60f632f95e4bb489bea430ba compares `JSON.stringify(encoded)` to `JSON.stringify(raw)` at line 428. Its raw input starts with metadata; the actual full Document Struct encoding ends with metadata. The read-only actual public encode probe shows all four document fields, every node/edge payload, the encoded Date and Counter values unchanged. Consumer 2 still exits 1. Preserve its fixture, log, receipt and probe bytes.

The sole existing executor may replace ONLY this new fixture's expected argument with the explicit object `{ nodeOrigin: raw.nodeOrigin, nodes: raw.nodes, edges: raw.edges, metadata: raw.metadata }`, formatted normally. Keep the same equality helper and assertion message. This independently retains every raw expected value without running another decoder as the expected-value oracle. Do not change production code, inherited assertions, other expectations, policy or public types. Record the exact before/after minimal diff and hashes.

Rerun scoped quality/typecheck, then the actual installed three-consumer gate under the existing 089 lease. A further genuine semantic failure stops for review. Both previous failed archive runs remain failed evidence. Focused verification and independent source review remain required before accepting this candidate. No commit, merge, publication or original generic member closure is permitted by this review.
