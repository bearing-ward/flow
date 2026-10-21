import { test } from '@playwright/test'

import { upstreamHostAdapter } from '../../shared-e2e/upstream/adapter.ts'
import { backgroundContract } from '../../shared-e2e/upstream/background.ts'
import { edgesContract } from '../../shared-e2e/upstream/edges.ts'
import { node_toolbarContract } from '../../shared-e2e/upstream/node-toolbar.ts'
import { nodesContract } from '../../shared-e2e/upstream/nodes.ts'
import { paneContract } from '../../shared-e2e/upstream/pane.ts'
import { propsContract } from '../../shared-e2e/upstream/props.ts'

test.use({ viewport: { width: 1280, height: 720 } })

const adapter = upstreamHostAdapter('vanilla')

backgroundContract(adapter)

edgesContract(adapter)

node_toolbarContract(adapter)

nodesContract(adapter)

paneContract(adapter)

propsContract(adapter)
