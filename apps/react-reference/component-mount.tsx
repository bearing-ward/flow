import { Schema as S } from 'effect'
import type { ReactNode } from 'react'
import { createRoot } from 'react-dom/client'

import type { ComponentReceipt } from '../shared/upstream/component.ts'

const viewport = S.Struct({ x: S.Number, y: S.Number, zoom: S.Number })

const check = S.Struct({ nodesLength: S.Number, lookupSize: S.Number })

const componentCommands = (id: number) => {
  const receipt: ComponentReceipt = {
    nodes: [],
    edges: [],
    initialized: [],
    viewports: [],
    starts: [],
    changes: [],
    ends: [],
    nodeChanges: [],
    events: {},
    checks: [],
    errors: [],
    inputs: [],
  }

  window.__component = receipt
  window.addEventListener('error', (event) =>
    receipt.errors.push(event.message)
  )

  return {
    mount: (element: ReactNode) => {
      const root = document.querySelector('#root')

      if (!root) {
        throw new Error('Missing React reference root')
      }

      createRoot(root).render(element)
    },
    spy: () => {
      let alias = ''

      const spy = (value: ComponentReceipt['nodes'][number]) => {
        const name = alias.replace(/Spy$/u, '')

        if (id <= 2) {
          receipt.edges.push(value)
        } else if (id <= 4) {
          receipt.nodes.push(value)
        } else if (id <= 8) {
          receipt.initialized.push(S.decodeUnknownSync(S.Boolean)(value))
        } else if (id <= 12) {
          const vp = S.decodeUnknownSync(viewport)(value)

          if (name === 'onStart') {
            receipt.starts.push(vp)
          }

          if (name === 'onChange') {
            receipt.changes.push(vp)
            receipt.viewports.push(vp)
          }

          if (name === 'onEnd') {
            receipt.ends.push(vp)
          }
        } else if (id <= 16 || id >= 55) {
          receipt.viewports.push(S.decodeUnknownSync(viewport)(value))
        } else if (id >= 43 && id <= 47) {
          receipt.nodeChanges.push(value)
        } else if (id >= 48 && id <= 50) {
          receipt.checks.push(S.decodeUnknownSync(check)(value))
        } else {
          receipt.events[name] = (receipt.events[name] ?? 0) + 1
        }
      }

      spy.as = (name: string) => {
        alias = name

        return spy
      }

      return spy
    },
  }
}

export const mountComponent = (
  id: number,
  mount: (cy: ReturnType<typeof componentCommands>) => void
) => mount(componentCommands(id))
