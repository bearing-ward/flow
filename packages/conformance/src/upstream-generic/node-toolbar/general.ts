// Upstream: examples/react/src/generic-tests/node-toolbar/general.ts
import { decodeGenericConfig } from '../model.ts'

export default decodeGenericConfig({
  document: {
    nodes: [
      {
        id: 'default-node',
        type: 'ToolbarNode',
        position: {
          x: 0,
          y: -200,
        },
        className: 'react-flow__node-default',
        label: 'toolbar top',
        data: {
          label: 'toolbar top',
          toolbarPosition: 'top',
        },
        handles: [
          {
            id: 'in',
            kind: 'target',
            side: 'left',
          },
          {
            id: 'out',
            kind: 'source',
            side: 'right',
          },
        ],
      },
      {
        id: 'node-start-top',
        type: 'ToolbarNode',
        className: 'react-flow__node-default',
        position: {
          x: 0,
          y: 0,
        },
        label: 'toolbar top start',
        data: {
          label: 'toolbar top start',
          toolbarPosition: 'top',
          toolbarAlign: 'start',
          toolbarVisible: true,
        },
        handles: [
          {
            id: 'in',
            kind: 'target',
            side: 'left',
          },
          {
            id: 'out',
            kind: 'source',
            side: 'right',
          },
        ],
      },
      {
        id: 'node-center-top',
        type: 'ToolbarNode',
        className: 'react-flow__node-default',
        position: {
          x: 0,
          y: 100,
        },
        label: 'toolbar top center',
        data: {
          label: 'toolbar top center',
          toolbarPosition: 'top',
          toolbarAlign: 'center',
          toolbarVisible: true,
        },
        handles: [
          {
            id: 'in',
            kind: 'target',
            side: 'left',
          },
          {
            id: 'out',
            kind: 'source',
            side: 'right',
          },
        ],
      },
      {
        id: 'node-end-top',
        type: 'ToolbarNode',
        className: 'react-flow__node-default',
        position: {
          x: 0,
          y: 200,
        },
        label: 'toolbar top end',
        data: {
          label: 'toolbar top end',
          toolbarPosition: 'top',
          toolbarAlign: 'end',
          toolbarVisible: true,
        },
        handles: [
          {
            id: 'in',
            kind: 'target',
            side: 'left',
          },
          {
            id: 'out',
            kind: 'source',
            side: 'right',
          },
        ],
      },
      {
        id: 'node-start-right',
        type: 'ToolbarNode',
        className: 'react-flow__node-default',
        position: {
          x: 300,
          y: 0,
        },
        label: 'toolbar right start',
        data: {
          label: 'toolbar right start',
          toolbarPosition: 'right',
          toolbarAlign: 'start',
          toolbarVisible: true,
        },
        handles: [
          {
            id: 'in',
            kind: 'target',
            side: 'left',
          },
          {
            id: 'out',
            kind: 'source',
            side: 'right',
          },
        ],
      },
      {
        id: 'node-center-right',
        type: 'ToolbarNode',
        className: 'react-flow__node-default',
        position: {
          x: 300,
          y: 100,
        },
        label: 'toolbar right center',
        data: {
          label: 'toolbar right center',
          toolbarPosition: 'right',
          toolbarAlign: 'center',
          toolbarVisible: true,
        },
        handles: [
          {
            id: 'in',
            kind: 'target',
            side: 'left',
          },
          {
            id: 'out',
            kind: 'source',
            side: 'right',
          },
        ],
      },
      {
        id: 'node-end-right',
        type: 'ToolbarNode',
        className: 'react-flow__node-default',
        position: {
          x: 300,
          y: 200,
        },
        label: 'toolbar right end',
        data: {
          label: 'toolbar right end',
          toolbarPosition: 'right',
          toolbarAlign: 'end',
          toolbarVisible: true,
        },
        handles: [
          {
            id: 'in',
            kind: 'target',
            side: 'left',
          },
          {
            id: 'out',
            kind: 'source',
            side: 'right',
          },
        ],
      },
      {
        id: 'node-start-bottom',
        type: 'ToolbarNode',
        className: 'react-flow__node-default',
        position: {
          x: 600,
          y: 0,
        },
        label: 'toolbar bottom start',
        data: {
          label: 'toolbar bottom start',
          toolbarPosition: 'bottom',
          toolbarAlign: 'start',
          toolbarVisible: true,
        },
        handles: [
          {
            id: 'in',
            kind: 'target',
            side: 'left',
          },
          {
            id: 'out',
            kind: 'source',
            side: 'right',
          },
        ],
      },
      {
        id: 'node-center-bottom',
        type: 'ToolbarNode',
        className: 'react-flow__node-default',
        position: {
          x: 600,
          y: 100,
        },
        label: 'toolbar bottom center',
        data: {
          label: 'toolbar bottom center',
          toolbarPosition: 'bottom',
          toolbarAlign: 'center',
          toolbarVisible: true,
        },
        handles: [
          {
            id: 'in',
            kind: 'target',
            side: 'left',
          },
          {
            id: 'out',
            kind: 'source',
            side: 'right',
          },
        ],
      },
      {
        id: 'node-end-bottom',
        type: 'ToolbarNode',
        className: 'react-flow__node-default',
        position: {
          x: 600,
          y: 200,
        },
        label: 'toolbar bottom end',
        data: {
          label: 'toolbar bottom end',
          toolbarPosition: 'bottom',
          toolbarAlign: 'end',
          toolbarVisible: true,
        },
        handles: [
          {
            id: 'in',
            kind: 'target',
            side: 'left',
          },
          {
            id: 'out',
            kind: 'source',
            side: 'right',
          },
        ],
      },
      {
        id: 'node-start-left',
        type: 'ToolbarNode',
        className: 'react-flow__node-default',
        position: {
          x: 900,
          y: 0,
        },
        label: 'toolbar left start',
        data: {
          label: 'toolbar left start',
          toolbarPosition: 'left',
          toolbarAlign: 'start',
          toolbarVisible: true,
        },
        handles: [
          {
            id: 'in',
            kind: 'target',
            side: 'left',
          },
          {
            id: 'out',
            kind: 'source',
            side: 'right',
          },
        ],
      },
      {
        id: 'node-center-left',
        type: 'ToolbarNode',
        className: 'react-flow__node-default',
        position: {
          x: 900,
          y: 100,
        },
        label: 'toolbar left center',
        data: {
          label: 'toolbar left center',
          toolbarPosition: 'left',
          toolbarAlign: 'center',
          toolbarVisible: true,
        },
        handles: [
          {
            id: 'in',
            kind: 'target',
            side: 'left',
          },
          {
            id: 'out',
            kind: 'source',
            side: 'right',
          },
        ],
      },
      {
        id: 'node-end-left',
        type: 'ToolbarNode',
        className: 'react-flow__node-default',
        position: {
          x: 900,
          y: 200,
        },
        label: 'toolbar left end',
        data: {
          label: 'toolbar left end',
          toolbarPosition: 'left',
          toolbarAlign: 'end',
          toolbarVisible: true,
        },
        handles: [
          {
            id: 'in',
            kind: 'target',
            side: 'left',
          },
          {
            id: 'out',
            kind: 'source',
            side: 'right',
          },
        ],
      },
    ],
    edges: [
      {
        id: 'first-edge',
        source: 'default-node',
        path: 'bezier',
        target: 'node-start-top',
      },
    ],
  },
  options: {
    fitView: true,
  },
})
