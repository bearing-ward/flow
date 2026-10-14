import { getBezierPath } from '@flow/core'
import { flowBaseEdge } from '@flow/foldkit'
import type { FoldkitRendererRegistry } from '@flow/foldkit'

import { mountRecipeHost } from '../recipe-host.ts'

import './turbo-flow.css'

const registry: FoldkitRendererRegistry = {
  nodeTypes: {
    turbo: (node, h) =>
      h.div(
        [h.Class('turbo-node'), h.DataAttribute('testid', 'turbo-node')],
        [h.div([h.Class('turbo-node-inner')], [node.label])]
      ),
  },
  edgeTypes: {
    turbo: (edge, { props }, h) => {
      const [path] = getBezierPath(props)
      const gradient = `turbo-gradient-${edge.id}`

      return h.g(
        [],
        [
          h.defs(
            [],
            [
              h.linearGradient(
                [
                  h.Id(gradient),
                  h.Attribute('x1', '0%'),
                  h.Attribute('y1', '0%'),
                  h.Attribute('x2', '100%'),
                  h.Attribute('y2', '100%'),
                ],
                [
                  h.stop([
                    h.Attribute('offset', '0%'),
                    h.Attribute('stop-color', '#ff0072'),
                  ]),
                  h.stop([
                    h.Attribute('offset', '100%'),
                    h.Attribute('stop-color', '#00d4ff'),
                  ]),
                ]
              ),
            ]
          ),
          flowBaseEdge(h, {
            path,
            attributes: {
              'data-testid': 'turbo-edge',
              stroke: `url(#${gradient})`,
              'stroke-width': '3',
            },
          }),
        ]
      )
    },
  },
}

mountRecipeHost({
  page: 'turbo-flow-page',
  registry,
  document: {
    nodes: [
      {
        id: 'a',
        type: 'turbo',
        label: 'Turbo input',
        position: { x: 100, y: 100 },
        size: { width: 180, height: 70 },
        sourcePosition: 'right',
      },
      {
        id: 'b',
        type: 'turbo',
        label: 'Turbo output',
        position: { x: 500, y: 300 },
        size: { width: 180, height: 70 },
        targetPosition: 'left',
      },
    ],
    edges: [{ id: 'turbo', type: 'turbo', source: 'a', target: 'b' }],
  },
})
