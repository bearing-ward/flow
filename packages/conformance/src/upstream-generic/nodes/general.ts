// Upstream: examples/react/src/generic-tests/nodes/general.ts
import { decodeGenericConfig } from '../model.ts'

export default decodeGenericConfig({
  document: {
    nodes: [
      {
        id: 'Node-1',
        position: {
          x: 0,
          y: 0,
        },
        type: 'input',
        className: 'playwright-test-class-123',
        style: {
          backgroundColor: 'red',
        },
        label: 'Node-1',
        data: {
          label: 'Node-1',
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
        id: 'Node-2',
        type: 'output',
        position: {
          x: -100,
          y: 100,
        },
        label: 'Node-2',
        data: {
          label: 'Node-2',
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
        ],
      },
      {
        id: 'Node-3',
        position: {
          x: 100,
          y: 100,
        },
        label: 'Node-3',
        data: {
          label: 'Node-3',
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
        id: 'Node-4',
        position: {
          x: 0,
          y: 200,
        },
        type: 'output',
        label: 'Node-4',
        data: {
          label: 'Node-4',
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
        ],
      },
      {
        id: 'drag-handle',
        position: {
          x: 200,
          y: 0,
        },
        type: 'DragHandleNode',
        dragHandle: '.custom-drag-handle',
        label: 'Drag Handle',
        data: {
          label: 'Drag Handle',
        },
        handles: [],
        size: {
          width: 100,
          height: 50,
        },
      },
      {
        id: 'notConnectable',
        type: 'output',
        position: {
          x: 0,
          y: 300,
        },
        connectable: false,
        label: 'notConnectable',
        data: {
          label: 'notConnectable',
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
        ],
      },
      {
        id: 'notDraggable',
        position: {
          x: 0,
          y: 400,
        },
        draggable: false,
        label: 'notDraggable',
        data: {
          label: 'notDraggable',
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
        id: 'notSelectable',
        position: {
          x: 0,
          y: 500,
        },
        selectable: false,
        label: 'notSelectable',
        data: {
          label: 'notSelectable',
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
        id: 'notDeletable',
        position: {
          x: 0,
          y: 600,
        },
        deletable: false,
        label: 'notDeletable',
        data: {
          label: 'notDeletable',
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
        id: 'hidden',
        position: {
          x: 0,
          y: 700,
        },
        hidden: true,
        label: 'hidden',
        data: {
          label: 'hidden',
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
        id: '1-2',
        type: 'default',
        source: 'Node-1',
        path: 'bezier',
        target: 'Node-2',
        label: 'edge',
      },
      {
        id: '1-3',
        type: 'default',
        source: 'Node-1',
        path: 'bezier',
        target: 'Node-3',
        label: 'edge',
      },
    ],
  },
  options: {
    fitView: true,
    deleteKeyCode: 'd',
    multiSelectionKeyCode: 's',
    nodeDragThreshold: 0,
  },
})
