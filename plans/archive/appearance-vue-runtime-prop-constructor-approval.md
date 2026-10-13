# 096 Vue runtime prop constructor clarification

Primary approval, baseline `841be137e253cf19c665269eaaa79edc19abf3c3`. This is a bounded interpretation of the approved appearance design; it authorizes no additional feature or source acceptance.

Root inspected candidate `packages/vue/src/flow-canvas.ts:474-535`, `packages/vue/src/ui.ts:49-66`, and `packages/vue/src/ui/status-indicator.ts:11-17`. These existing adapters annotate native Vue String/Object/Function constructors with `PropType` to preserve static contracts. The standards still require external values to be decoded at a boundary.

For selected 096 props only, the same constructor annotation is permitted: `String as PropType<SchemaDerivedUnion>`, `Object as PropType<SchemaDerivedConfig>`, or `Function as PropType<ExistingHostLocalCallback>`. Use the actual authoritative Schema-derived appearance types and the existing host-local callback contract. Explain the constructor annotation with a scoped SAFETY comment; do not add or broaden lint suppressions. Boolean constructors need no annotation.

This permission does not validate incoming values. The complete appearance replacement must still pass the approved actual decoder and atomic last-valid policy before any graph, DOM, selection, keyboard, or callback use. Vue validators alone are insufficient because their warnings do not prevent invalid props. Callback values must satisfy the native callable boundary before invocation, with the existing failure policy preserved. Do not assert external values, decoded results, graph objects, component instances, or callback responses into these types. Do not introduce double assertions, any, duplicate interfaces, fake defaults, or casts to avoid a compiler failure.

Preserve all prior source and diagnostic evidence. Continue local execution in the same isolated 096 checkout; shared gates remain withheld. If the actual declaration needs a value cast or a widened suppression beyond the constructor annotations above, STOP that slice and report the concrete declaration/compiler failure while continuing independent approved work.

## Conformity and deviations

The declaration follows the existing Vue adapter convention. Appearance semantics, last-valid recovery, real native delivery, packed consumers, and all 189 parent cells remain unverified until their required gates and independent source review.
