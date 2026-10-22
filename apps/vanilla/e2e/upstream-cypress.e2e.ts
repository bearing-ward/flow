import { basicContract } from '../../shared-e2e/upstream-cypress/basic.ts'
import { controlsContract } from '../../shared-e2e/upstream-cypress/controls.ts'
import { draghandleContract } from '../../shared-e2e/upstream-cypress/draghandle.ts'
import { emptyContract } from '../../shared-e2e/upstream-cypress/empty.ts'
import { figmaContract } from '../../shared-e2e/upstream-cypress/figma.ts'
import { hiddenContract } from '../../shared-e2e/upstream-cypress/hidden.ts'
import { interactionContract } from '../../shared-e2e/upstream-cypress/interaction.ts'
import { minimapContract } from '../../shared-e2e/upstream-cypress/minimap.ts'
import { upstreamHostAdapter } from '../../shared-e2e/upstream/adapter.ts'

const adapter = upstreamHostAdapter('vanilla')

basicContract(adapter)

controlsContract(adapter)

draghandleContract(adapter)

emptyContract(adapter)

figmaContract(adapter)

hiddenContract(adapter)

interactionContract(adapter)

minimapContract(adapter)
