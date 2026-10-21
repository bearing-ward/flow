// Upstream: examples/react/src/generic-tests/edges/general.ts
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
      {
        id: '4',
        position: {
          x: -100,
          y: 200,
        },
        label: '4',
        data: {
          label: '4',
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
        id: '5',
        position: {
          x: 100,
          y: 200,
        },
        label: '5',
        data: {
          label: '5',
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
        id: '6',
        position: {
          x: -100,
          y: 300,
        },
        label: '6',
        data: {
          label: '6',
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
        id: '7',
        position: {
          x: 100,
          y: 300,
        },
        label: '7',
        data: {
          label: '7',
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
        id: '8',
        position: {
          x: -100,
          y: 400,
        },
        label: '8',
        data: {
          label: '8',
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
        id: '9',
        position: {
          x: 100,
          y: 400,
        },
        label: '9',
        data: {
          label: '9',
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
        id: '10',
        position: {
          x: -100,
          y: 500,
        },
        label: '10',
        data: {
          label: '10',
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
        id: '11',
        position: {
          x: 100,
          y: 500,
        },
        label: '11',
        data: {
          label: '11',
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
        id: '12',
        position: {
          x: 100,
          y: 600,
        },
        label: '12',
        data: {
          label: '12',
        },
        size: {
          width: 200,
          height: 100,
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
        id: '12-a',
        parentId: '12',
        position: {
          x: 10,
          y: 20,
        },
        label: '12-a',
        data: {
          label: '12-a',
        },
        size: {
          width: 50,
          height: 50,
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
        id: '12-b',
        parentId: '12',
        position: {
          x: 140,
          y: 20,
        },
        label: '12-b',
        data: {
          label: '12-b',
        },
        size: {
          width: 50,
          height: 50,
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
        id: 'edge-with-class',
        source: '1',
        path: 'bezier',
        target: '2',
        className: 'edge-class-test',
      },
      {
        id: 'edge-with-style',
        source: '1',
        path: 'bezier',
        target: '3',
        style: {
          stroke: 'red',
        },
      },
      {
        id: 'hidden-edge',
        source: '2',
        path: 'bezier',
        target: '4',
        label: 'hidden',
        hidden: true,
      },
      {
        id: 'animated-edge',
        source: '3',
        path: 'bezier',
        target: '5',
        label: 'animated',
        animated: true,
      },
      {
        id: 'not-selectable-edge',
        source: '4',
        path: 'bezier',
        target: '6',
        label: 'not-selectable',
        selectable: false,
      },
      {
        id: 'not-deletable',
        source: '5',
        path: 'bezier',
        target: '7',
        label: 'not-deletable',
        deletable: false,
      },
      {
        id: 'z-index',
        source: '6',
        path: 'bezier',
        target: '8',
        label: 'z-index',
        zIndex: 3_141_592,
      },
      {
        id: 'aria-label',
        source: '7',
        path: 'bezier',
        target: '9',
        label: 'aria-label',
        ariaLabel: 'aria-label-test',
      },
      {
        id: 'interaction-width',
        source: '8',
        path: 'bezier',
        target: '10',
        label: 'interaction-width',
        interactionWidth: 42,
      },
      {
        id: 'markers',
        source: '9',
        path: 'bezier',
        target: '11',
        label: 'markers',
        markerEnd: {
          type: 'arrow',
        },
        markerStart: {
          type: 'arrowclosed',
        },
      },
      {
        id: 'subflow-edge',
        source: '11',
        path: 'bezier',
        target: '12-a',
      },
      {
        id: 'subflow-edge-2',
        source: '12-a',
        path: 'bezier',
        target: '12-b',
      },
    ],
  },
  options: {
    fitView: true,
    multiSelectionKeyCode: 's',
    deleteKeyCode: 'd',
  },
})
