# Marker configuration foundation design

2026-10-02. Draft for primary and independent cold design review. The proposed source child is Plan 090. This document authorizes no executor and closes no original 073 member.

## Decision and sequencing

Add the exact approved public `FlowEdgeMarkerConfigurationSchema`, `FlowEdgeMarkerConfiguration`, `FlowEdgeMarkerValueSchema` and `FlowEdgeMarkerValue` to core. Implement them in existing `packages/core/src/domain/flow.schema.ts`, beside the current literal kind, with a package-private canonical configuration Struct, validating Declaration and checked JSON color-presence projection. Existing `FlowEdgeMarkerSchema` and `FlowEdgeMarker` keep their two-literal meaning. Every pre-existing schema, type and workflow definition in that file remains byte-identical; only imports and the new standalone block are added.

This child deliberately leaves `FlowEdgeSchema` and default marker fields unchanged. The new value schema is independently useful to callers validating configuration and composing their own Schema contracts, but is not yet accepted by Flow graph or host inputs. Documentation and tests must say so. No source claim may call the disconnected foundation live marker support, mounted preservation, string-reference support or original member closure.

Immediate shared-edge widening is not a safe core-only implementation. Accepted 087 actual source has these incompatible downstream functions:

- `apps/vanilla/src/edge-renderer.ts:131` accepts `FlowEdgeMarker`, then `:503-515` passes each accepted endpoint directly to that function.
- `packages/vue/src/flow-canvas.ts:406-410` accepts only `arrow | arrowclosed` in `markerId`; `:4483-4488` and `:4626-4633` call it with accepted edge endpoints.
- `packages/foldkit/src/graph.ts:2773-2778` accepts only `arrow | arrowclosed` in `markerDefinition`; `:2817-2830` forwards accepted endpoints to it.
- `packages/core/src/domain/flow-default-edge-options.ts:15-33` and `flow.schema.ts:116-141` still use the old literal kind, while explicit persistence schemas and renderer geometry assume that contract.

The source root for those citations is `/Users/richardmcandrews/.codex/worktrees/typed-data-factory/flow`. Expanding their input type without coordinating actual geometry, URL ownership, definitions and persistence would either fail compilation or publish unsupported values. Casting or narrowing away object/reference branches is unacceptable. A later coordinated native/integration child must approve and implement those actual consuming paths before it widens shared fields.

## Single canonical schema authority

The canonical internal Struct has exactly required `type: FlowEdgeMarkerSchema`; optional `color: string | null | undefined`; optional finite nonnegative `width`, `height`, `strokeWidth`; optional arbitrary-string `markerUnits`, `orient`; and reserved live `colorPresence` via optional-key Never. Types derive from these fields. Defaults remain rendering policy, so decoding does not inject numeric, color, units or orientation defaults. Zero, empty strings and own undefined are retained.

`FlowEdgeMarkerConfigurationSchema` is a validating Declaration parameterized by that Struct. Its Type and Encoded coincide with the canonical live type, and both service environments are never. Unknown parsing delegates to `SchemaParser.decodeUnknownEffect(shape)` with the provided parse options. Equality delegates to the parameter's derived equality, including own-key presence. Its JSON hook links to a wire configuration Struct derived from those same fields, overriding only `colorPresence` with optional-key literal `explicit-undefined`. Check flag/color conflicts before stripping. Checked transformations parse their inverse results through the canonical/wire authority.

The public declaration has no fields/mapFields facade. The bare canonical Struct and wire schema are not exported. Do not place this authority in the geometry module and import the kind from flow.schema.ts: later integrating the value into FlowEdgeSchema would require the reverse runtime dependency. Keeping the new block beside the existing kind avoids that cycle without moving or duplicating the kind. The geometry module remains byte-identical.

`FlowEdgeMarkerValueSchema` is the actual union of String and the same validating configuration Declaration. It admits empty strings and arbitrary logical strings as data without promising that current Flow hosts consume them. It rejects endpoint null, functions and malformed objects. Optional outer undefined belongs to a caller's `S.optional(FlowEdgeMarkerValueSchema)` composition, not the value schema itself.

## Ordinary Schema and canonical JSON

Ordinary decode/encode deliver live fields, preserve own undefined, and contain no wire metadata. The canonical JSON route uses these exact color cases:

| Live configuration | Canonical JSON configuration | Decoded configuration |
| --- | --- | --- |
| color absent | neither color nor colorPresence | color absent |
| own color undefined | colorPresence explicit-undefined, no color | own color undefined |
| color null | color null, no flag | color null |
| color empty or concrete string | exact color, no flag | exact color |

The wire decoder rejects invalid flag discriminators, undefined flags, flag plus any own color including undefined, and invalid known field values. Live decode rejects own `colorPresence`, including undefined. Unrelated unknown fields retain normal Struct stripping behavior; this child invents no whole-object strict-excess policy. Unknown keys in arbitrary user data are not examined because no graph/data transport changes here.

High-level Schema decode/encode failures remain `S.SchemaError`; internal parser/transformation failures remain `SchemaIssue.Issue`. Never catch a failure and return a valid configuration. Invalid synchronous routes must contain typed failure rather than defects, interrupts or asynchronous suspension. Use one stable conflict filter message, `Marker color flag/value conflict`; other parser message text follows the installed Schema formatter and is not a new domain error contract.

Canonical enclosing caller Structs can recursively reach the nested hook and retain their real Struct operations. Optional outer undefined can use the installed null sentinel because a live value null is rejected. Tests may construct caller-owned small Structs to prove recursive derivation. They must never label such a construct the actual Flow document, application Model or Runtime.

## Fixed input and proof boundary

The sole source input is accepted Plan 087, `/Users/richardmcandrews/.codex/worktrees/typed-data-factory/flow`, HEAD `841be137e253cf19c665269eaaa79edc19abf3c3` plus frozen working changes. Its external freeze is `/Users/richardmcandrews/.codex/worktrees/typed-data-factory/typed-factory-evidence/final-freeze.json`, SHA256 `2dee299d28a1b96442e3134cd4b46c380dd3dd2caeef9f28bcb46c7e96d90917`. This draft independently rehashed all 1,492 complete candidate files and all 122 evidence files with zero mismatch. Accepted 085 inheritance remains part of that exact input. Do not borrow moving 086, 089 or the 088 utility delta.

The approved architecture inputs are retained continuation `8f05f10bee7b1d926da68c82c429b87569ca7f21dc88f6df2cdd8dd16fe661e2`, nested amendment `20836dfd558311b91f19099e7c1944fc8d46b166d7e6dde295e72e87a04ce55a`, and cold architecture approval `3e8faf24c0e532bc62481ecb8ed6c42a49497d4904f3bee26962a01f06aa4bac`. The frozen alternative probe `e54e493d76f1d17a76709a47fa61da8af39cffffeab54b98753ef83071b4231c` and byte-identical independently reproduced output `2e76fde02b890a573d3faf58493bf20cdbb9b48fdba0a849201fd0eb123218e8` prove the installed parser/compiler alternative only. Product source and installed-package proof must be new evidence.

Plan 090 includes meaningful core units, exact-optional compiler negatives, and common public runtime/type fixtures installed from actual tarballs in all three existing consumer modes. Existing archive install/peer/type/browser steps and old factory tests remain intact. Saved focused scope selects docs, contracts, api-members, traces and consumer, with no additional browser suites. Existing consumer browser checks still run. They guard package compatibility, not new marker rendering. Final focused verification, scope review, frozen manifests, independent source review and primary reproduction are required before accepting this foundation.

## Retained follow-up policies

This additive phase does not weaken the approved full continuation. The later coordinated integration keeps endpoint absent versus own undefined versus empty string; object color absent versus own undefined versus null/empty/string; pinned object geometry/defaults and computed SVG; explicit saved-v2 endpoint flags separate from canonical Model sentinels; frozen legacy1 acceptance/output and ordered errors; independent additive2 selection; marker-only patch presence restoration; Foldkit marker-presence revision comparison; ordinary ports and actual widened Model/HMR; owner-local native registry and exception/reentrancy/cleanup proof; full graph-space MiniMap props and style/event propagation.

Dependencies 068 global color, 074 genuine CSS style, 069 typed propagation, 086 actual native geometry and 058 whole MiniMap remain open. Those follow-ups must give exact scope and actual consuming proof. Plan 090 adds no renderer registry, save helper, wire endpoint metadata, revision owner, public callback, alternate graph or Runtime serializer.

## Conformity and deviations

Conformity target for this source child is the approved Schema contract and reproduced nested JSON inverse. Finite/nonnegative marker numbers and the public validating Declaration are deliberate Flow design choices. Pinned object fields are source-backed contract inputs; no paired reference/native parity is established here.

All 101 original 073 members and 303 host cells remain open. Current graph/default/native marker acceptance, full application preservation, save/patch/client/registry/SVG/MiniMap behavior, broader focused/full integration, CI, native devices and collector delivery remain unverified. The additive public foundation is a prerequisite for later integration, not a completion claim for those paths.
