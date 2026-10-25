import { createRoot } from 'react-dom/client'

import '@xyflow/react/dist/style.css'
import Backgrounds from '../../research/artifacts/xyflow/3d35b57317576b0916c0bfeaaedd573aaacc2839/examples/react/src/examples/Backgrounds/index.tsx?reference-page'

import './style.css'
import Basic from '../../research/artifacts/xyflow/3d35b57317576b0916c0bfeaaedd573aaacc2839/examples/react/src/examples/Basic/index.tsx?reference-page'
import ColorMode from '../../research/artifacts/xyflow/3d35b57317576b0916c0bfeaaedd573aaacc2839/examples/react/src/examples/ColorMode/index.tsx?reference-page'
import DragHandle from '../../research/artifacts/xyflow/3d35b57317576b0916c0bfeaaedd573aaacc2839/examples/react/src/examples/DragHandle/index.tsx?reference-page'
import Empty from '../../research/artifacts/xyflow/3d35b57317576b0916c0bfeaaedd573aaacc2839/examples/react/src/examples/Empty/index.tsx?reference-page'
import Figma from '../../research/artifacts/xyflow/3d35b57317576b0916c0bfeaaedd573aaacc2839/examples/react/src/examples/Figma/index.tsx?reference-page'
import Hidden from '../../research/artifacts/xyflow/3d35b57317576b0916c0bfeaaedd573aaacc2839/examples/react/src/examples/Hidden/index.tsx?reference-page'
import Interaction from '../../research/artifacts/xyflow/3d35b57317576b0916c0bfeaaedd573aaacc2839/examples/react/src/examples/Interaction/index.tsx?reference-page'
import GenericFlow from '../../research/artifacts/xyflow/3d35b57317576b0916c0bfeaaedd573aaacc2839/examples/react/src/generic-tests/Flow.tsx?reference-page'
import { mountComponent } from './component-mount.tsx'
import { ResizeRegression } from './resize-regression.tsx'

import exampleStyles from '../../research/artifacts/xyflow/3d35b57317576b0916c0bfeaaedd573aaacc2839/examples/react/src/index.css?inline'

const examples = {
  basic: Basic,
  controls: Basic,
  draghandle: DragHandle,
  empty: Empty,
  figma: Figma,
  hidden: Hidden,
  interaction: Interaction,
  minimap: Basic,
  'color-mode': ColorMode,
  backgrounds: Backgrounds,
}

const configs = import.meta.glob(
  '../../research/artifacts/xyflow/3d35b57317576b0916c0bfeaaedd573aaacc2839/examples/react/src/generic-tests/**/*.ts',
  { eager: true, import: 'default' }
)

const utilityCases = {
  77: () => import('reference-utility:UP-128-077'),
  78: () => import('reference-utility:UP-128-078'),
  79: () => import('reference-utility:UP-128-079'),
  80: () => import('reference-utility:UP-128-080'),
  81: () => import('reference-utility:UP-128-081'),
  82: () => import('reference-utility:UP-128-082'),
  83: () => import('reference-utility:UP-128-083'),
  84: () => import('reference-utility:UP-128-084'),
  85: () => import('reference-utility:UP-128-085'),
  86: () => import('reference-utility:UP-128-086'),
  87: () => import('reference-utility:UP-128-087'),
  88: () => import('reference-utility:UP-128-088'),
  89: () => import('reference-utility:UP-128-089'),
  90: () => import('reference-utility:UP-128-090'),
  91: () => import('reference-utility:UP-128-091'),
  92: () => import('reference-utility:UP-128-092'),
  93: () => import('reference-utility:UP-128-093'),
  94: () => import('reference-utility:UP-128-094'),
  95: () => import('reference-utility:UP-128-095'),
  96: () => import('reference-utility:UP-128-096'),
  97: () => import('reference-utility:UP-128-097'),
  98: () => import('reference-utility:UP-128-098'),
  99: () => import('reference-utility:UP-128-099'),
  100: () => import('reference-utility:UP-128-100'),
  101: () => import('reference-utility:UP-128-101'),
  102: () => import('reference-utility:UP-128-102'),
  103: () => import('reference-utility:UP-128-103'),
  104: () => import('reference-utility:UP-128-104'),
  105: () => import('reference-utility:UP-128-105'),
  106: () => import('reference-utility:UP-128-106'),
  107: () => import('reference-utility:UP-128-107'),
}

const componentMounts = {
  1: () => import('reference-component:UP-128-001'),
  2: () => import('reference-component:UP-128-002'),
  3: () => import('reference-component:UP-128-003'),
  4: () => import('reference-component:UP-128-004'),
  5: () => import('reference-component:UP-128-005'),
  6: () => import('reference-component:UP-128-006'),
  7: () => import('reference-component:UP-128-007'),
  8: () => import('reference-component:UP-128-008'),
  9: () => import('reference-component:UP-128-009'),
  10: () => import('reference-component:UP-128-010'),
  11: () => import('reference-component:UP-128-011'),
  12: () => import('reference-component:UP-128-012'),
  13: () => import('reference-component:UP-128-013'),
  14: () => import('reference-component:UP-128-014'),
  15: () => import('reference-component:UP-128-015'),
  16: () => import('reference-component:UP-128-016'),
  17: () => import('reference-component:UP-128-017'),
  18: () => import('reference-component:UP-128-018'),
  19: () => import('reference-component:UP-128-019'),
  20: () => import('reference-component:UP-128-020'),
  21: () => import('reference-component:UP-128-021'),
  22: () => import('reference-component:UP-128-022'),
  23: () => import('reference-component:UP-128-023'),
  24: () => import('reference-component:UP-128-024'),
  25: () => import('reference-component:UP-128-025'),
  26: () => import('reference-component:UP-128-026'),
  27: () => import('reference-component:UP-128-027'),
  28: () => import('reference-component:UP-128-028'),
  29: () => import('reference-component:UP-128-029'),
  30: () => import('reference-component:UP-128-030'),
  31: () => import('reference-component:UP-128-031'),
  32: () => import('reference-component:UP-128-032'),
  33: () => import('reference-component:UP-128-033'),
  34: () => import('reference-component:UP-128-034'),
  35: () => import('reference-component:UP-128-035'),
  36: () => import('reference-component:UP-128-036'),
  37: () => import('reference-component:UP-128-037'),
  38: () => import('reference-component:UP-128-038'),
  39: () => import('reference-component:UP-128-039'),
  40: () => import('reference-component:UP-128-040'),
  41: () => import('reference-component:UP-128-041'),
  42: () => import('reference-component:UP-128-042'),
  43: () => import('reference-component:UP-128-043'),
  44: () => import('reference-component:UP-128-044'),
  45: () => import('reference-component:UP-128-045'),
  46: () => import('reference-component:UP-128-046'),
  47: () => import('reference-component:UP-128-047'),
  48: () => import('reference-component:UP-128-048'),
  49: () => import('reference-component:UP-128-049'),
  50: () => import('reference-component:UP-128-050'),
  51: () => import('reference-component:UP-128-051'),
  52: () => import('reference-component:UP-128-052'),
  53: () => import('reference-component:UP-128-053'),
  54: () => import('reference-component:UP-128-054'),
  55: () => import('reference-component:UP-128-055'),
  56: () => import('reference-component:UP-128-056'),
  57: () => import('reference-component:UP-128-057'),
  58: () => import('reference-component:UP-128-058'),
  59: () => import('reference-component:UP-128-059'),
  60: () => import('reference-component:UP-128-060'),
  61: () => import('reference-component:UP-128-061'),
  62: () => import('reference-component:UP-128-062'),
  63: () => import('reference-component:UP-128-063'),
  64: () => import('reference-component:UP-128-064'),
  65: () => import('reference-component:UP-128-065'),
  66: () => import('reference-component:UP-128-066'),
  67: () => import('reference-component:UP-128-067'),
  68: () => import('reference-component:UP-128-068'),
  69: () => import('reference-component:UP-128-069'),
  70: () => import('reference-component:UP-128-070'),
  71: () => import('reference-component:UP-128-071'),
  72: () => import('reference-component:UP-128-072'),
  73: () => import('reference-component:UP-128-073'),
  74: () => import('reference-component:UP-128-074'),
  75: () => import('reference-component:UP-128-075'),
  76: () => import('reference-component:UP-128-076'),
}

const root = document.querySelector('#root')

if (!root) {
  throw new Error('Missing React reference root')
}

const path = window.location.pathname

if (path.startsWith('/upstream-utility/')) {
  const id = path.split('/').at(-1)
  const load = Object.entries(utilityCases).find(([key]) => key === id)?.[1]

  if (!load) {
    throw new Error(`Unknown reference utility ${id}`)
  }

  const fixture = await load()

  try {
    fixture.default()
    window.__referenceUtility = null
  } catch (error) {
    window.__referenceUtility =
      error instanceof Error ? error.message : String(error)
  }
} else if (path === '/resize-regression') {
  createRoot(root).render(<ResizeRegression />)
} else if (path.startsWith('/upstream-component/')) {
  const id = Number(path.split('/').at(-1))

  const load = Object.entries(componentMounts).find(
    ([key]) => Number(key) === id
  )?.[1]

  if (!load) {
    throw new Error(`Unknown reference component ${id}`)
  }

  const fixture = await load()
  mountComponent(id, fixture.default)
} else {
  const style = document.createElement('style')
  style.textContent = exampleStyles
  document.head.append(style)

  const name = path.split('/').at(-1) ?? ''
  const Example = Object.entries(examples).find(([key]) => key === name)?.[1]

  if (Example) {
    createRoot(root).render(<Example />)
  } else {
    const suffix = `${path.replace('/upstream/', '')}.ts`

    const config = Object.entries(configs).find(([key]) =>
      key.endsWith(suffix)
    )?.[1]

    if (!config) {
      throw new Error(`Unknown generic fixture ${path}`)
    }

    createRoot(root).render(<GenericFlow flowConfig={config} />)
  }
}

// Readiness is mount completion, not a substitute for the shared assertions.
requestAnimationFrame(() =>
  requestAnimationFrame(() => {
    const app = document.querySelector<HTMLElement>('#app')

    if (app) {
      app.dataset.upstreamReady = 'true'
    }
  })
)
