// Upstream: examples/react/src/generic-tests/pane/non-defaults.ts
import { decodeGenericConfig } from '../model.ts'

export default decodeGenericConfig({
  document: {
    nodes: [
      {
        id: '1',
        position: {
          x: 0,
          y: 0,
        },
        type: 'input',
        label: '1',
        data: {
          label: '1',
        },
        size: {
          width: 150,
          height: 40,
        },
        handles: [
          {
            id: 'out',
            kind: 'source',
            side: 'bottom',
          },
        ],
      },
      {
        id: '2',
        position: {
          x: -100,
          y: 100,
        },
        label: '2',
        data: {
          label: '2',
        },
        size: {
          width: 150,
          height: 40,
        },
        handles: [
          {
            id: 'in',
            kind: 'target',
            side: 'top',
          },
          {
            id: 'out',
            kind: 'source',
            side: 'bottom',
          },
        ],
      },
      {
        id: '3',
        position: {
          x: 100,
          y: 100,
        },
        label: '3',
        data: {
          label: '3',
        },
        size: {
          width: 150,
          height: 40,
        },
        handles: [
          {
            id: 'in',
            kind: 'target',
            side: 'top',
          },
          {
            id: 'out',
            kind: 'source',
            side: 'bottom',
          },
        ],
      },
    ],
    edges: [
      {
        id: 'first-edge',
        source: '1',
        path: 'bezier',
        target: '2',
      },
      {
        id: 'second-edge',
        source: '1',
        path: 'bezier',
        target: '3',
      },
    ],
  },
  options: {
    panOnScroll: true,
    panOnDrag: [1, 2],
    selectionOnDrag: true,
    defaultViewport: {
      x: 1.23,
      y: 9.87,
      zoom: 1.234,
    },
    autoPanOnConnect: false,
    autoPanOnNodeDrag: false,
  },
})
