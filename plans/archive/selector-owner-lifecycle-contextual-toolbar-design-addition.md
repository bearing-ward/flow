# Selector095 contextual toolbar design addition

2026-10-02. This adds to original095 and the live-context design revision. Keep both independent REVISE files, both original inventories and all81 historical hunks immutable. This is a proposed design correction; source dispatch still requires primary and independent approval of the complete combined packet.

The primary independently read the full accepted087 toolbar, fixture and browser test, and searched all package/app/test FlowNodeIdKey consumers. The toolbar is the only additional direct read consumer. It captures injection during setup at node-toolbar107, then uses props.nodeId ?? contextualNodeId at111 before the NodeId string guard116. Actual readonly computed context would fail that guard. Existing fixture109-112 supplies explicit nodeId and cannot detect the regression.

## Narrow migration

Add packages/vue/src/node-toolbar.ts to the functional allowlist only for importing Vue unref and resolving the already captured native context inside its render function. Use explicit props.nodeId first, otherwise unref the retained binding, before the existing NodeId guard. Injection remains a setup operation. Never inject during render. Preserve all other guards, selected-count policy, target ownership, measured anchor geometry, Teleport, DOM classes/attributes, style/slot/interaction behavior and explicit nodeId precedence. Missing/invalid context keeps the current null behavior. A plain-string provider still works, and readonly-ref replacement updates the current node in the same consumer scope.

Recheck every FlowNodeIdKey/useNodeId consumer before assembly and freeze. Stop for any additional migration outside this allowance. The proposed public InjectionKey binding union exposes its true native string-or-ref type; useNodeId still returns string|undefined at each synchronous call. Document this union extension in the allowed Vue API documentation and test installed declarations for both kinds of provider. Do not claim unchanged direct-inject result type, use casts, invent a second context authority, or serialize framework refs.

## Additive mounted proof

Add a SEPARATE fixture export to apps/vue/src/node-toolbar-test.ts and SEPARATE cases to apps/vue/e2e/node-toolbar.e2e.ts. Keep the entire existing fixture export and existing browser test body/assertions unchanged. The existing toolbarOwners[0,0,1] assertion must not be changed to absorb new nodes/toolbars.

The new fixture mounts the actual public FlowNodeToolbar inside a real FlowCanvas custom node WITHOUT explicit nodeId, through the actual NodeWithIdContext provider. Prove data-node-toolbar equals its accepted node ID, visible output, per-canvas target and geometry measured against that node's DOM bounds. Check trusted interaction exclusion, public accepted-node movement, viewport zoom, selection visibility and cleanup using the real public composition. In a separate scoped public provider input, exercise string and readonly-ref contexts, same-scope a-to-b replacement with setup/unmount counts, explicit nodeId override over conflicting context, missing/invalid context, and late work after disposal. Do not write private graph/Model or fabricate correlated replies. Node.id-keyed replacement remains a separate remount proof from live provider replacement.

Include apps/vue/e2e/node-toolbar.e2e.ts in the saved focused verification scope and run it alongside095 native owner suites, unit tests, the genuine reference and three installed archives. Installed Vue proof must exercise contextual toolbar fallback and explicit override; root typechecking alone cannot prove runtime compatibility. Preserve the pinned reference histories and the explicit native silent baseline difference. All original source/evidence/gate and counter codec requirements remain.

## Conformity and deviations

Conforming targets are contextual toolbar fallback, explicit nodeId precedence, measured screen-space anchoring and accepted-state ownership. The native injection binding gains readonly-ref support and advertises that union honestly; this is a framework-specific extension. Actual same-scope/ref/remount/toolbar behavior, declaration compatibility and all095 gates remain unverified until execution. All513 parent cells remain OPEN.
