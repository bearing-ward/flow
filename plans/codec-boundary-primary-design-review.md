# Primary review: 069 codec boundary design

Decision: **APPROVE the amended architecture**, 2026-09-30 at `841be13`. Product implementation and original generic member acceptance remain pending.

Primary read the complete proposed signatures, installed-source investigation, compiler probe and mounted runtime/browser fixture. The first review required isolated inputs for custom encoders and the isolation environment in `encodeDocument`. The amended design supplies private deliveries to successful and failing encoders, places custom validation before the final trusted isolation copy, and specifies detached immutable JSON checkpoints. A caller isolation capability is an explicit trust boundary: Schema validation and freezing cannot establish independence of Date or private class state.

Independent amended reruns all exited zero:

- `bun run plans/069-codec-boundary-probe.ts`: zero diagnostics, 13 checked negative cases, two exact design declaration blocks compiled against the current core public source; helper execution remains a separate boundary. Log `/tmp/flow-069-primary-revision1-probe.log`.
- The complete strict no-emit harness TypeScript command recorded in the design: exit zero. Log `/tmp/flow-069-primary-revision1-types.log`.
- `bun run plans/069-codec-boundary-browser.ts` against an independently owned Vite server on 4195: actual installed Foldkit Runtime and full Vite reload passed. Log `/tmp/flow-069-primary-revision1-browser.log`. The server was stopped afterward.

The mounted assertions cover independent Date/private Counter reads and render deliveries, no callback reuse on a native tick, a fresh isolated renderer delivery, successful update, encoding rejection without an accepted change, successful and failing encoders that mutate only their private inputs, restored revision/data after reload, disposal and zero page defects. These establish feasibility for the scalar prototype, not a production Flow generic graph.

The source implementation must serialize writers, validate complete graph invariants, stage encoding and renderer data, acknowledge projection delivery before claiming durable acceptance, handle delivery failure atomically, and prove controlled proposals, observers, reload/disposal races, multiple owners and resource cleanup. The prototype currently commits authority before checking `port.send`; that ordering is explicitly unapproved for production. The default concrete JSON API remains unchanged. Foldkit's typed composition has one core decoded authority and a JSON-only presentation/checkpoint model; prepared callbacks execute inside the real native view frame with one-use delivery identity. No second graph authority or synchronous serviceful getter is approved.

## Conformity and deviations

**Approved intentional architecture:** separate Effectful typed APIs and trusted caller isolation preserve services and decoded class values. **Observed feasibility:** compiler, installed helper and mounted scalar Runtime boundaries are distinct and reproduced. **Unverified:** full Flow graph implementation, transaction/delivery/concurrency guarantees, packed artifacts, native generic correspondence and original member closure. No plan 069 DONE, parity, CI or collector-delivery claim follows from this approval.
