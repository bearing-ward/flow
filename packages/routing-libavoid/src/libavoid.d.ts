declare module 'libavoid-js' {
  export const AvoidLib: {
    readonly load: (wasmUrl?: string) => Promise<void>
    // oxlint-disable-next-line anti-slop/no-unknown-returns -- The unchecked vendor namespace is decoded by NamespaceSchema before use.
    readonly getInstance: () => unknown
  }
}
