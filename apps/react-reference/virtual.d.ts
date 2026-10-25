declare module 'reference-component:*' {
  import type { mountComponent } from '#reference-component-mount'

  const mount: (cy: Parameters<Parameters<typeof mountComponent>[1]>[0]) => void

  export default mount
}

declare module '*?reference-page' {
  import type { ComponentType } from 'react'

  const component: ComponentType<{ flowConfig?: unknown }>
  export default component
}

interface Window {
  __referenceUtility: string | null
}

declare module 'reference-utility:*' {
  const run: () => void
  export default run
}
