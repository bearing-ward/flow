import { makeTypedFlow } from '@flow/core'
import {
  aiWorkflowFixture,
  baseWorkflowFixture,
  decodeWorkflowDocument,
  workflowDataContract,
  workflowIssues,
} from '@flow/workflow'
import type { WorkflowDocument, WorkflowNodeData } from '@flow/workflow'
import { Effect } from 'effect'

const document: WorkflowDocument = await Effect.runPromise(
  decodeWorkflowDocument(baseWorkflowFixture)
)

const data: WorkflowNodeData | undefined = document.nodes[0]?.data?.workflow

if (
  data?.kind !== 'initial' ||
  data.config.value !== 'hello' ||
  workflowIssues(document).length !== 0
) {
  throw new Error('Packed workflow schema/configuration mismatch')
}

await Effect.runPromise(
  Effect.scoped(
    Effect.gen(function* provePackedWorkflow() {
      const flow = yield* makeTypedFlow({
        contract: workflowDataContract,
        viewport: { x: 0, y: 0, zoom: 1 },
        initial: { kind: 'decoded', input: document },
      })

      yield* flow.replaceEncoded(aiWorkflowFixture, 0)
      const snapshot = yield* flow.readSnapshot()

      if (
        snapshot.revision !== 1 ||
        snapshot.document.nodes.find(({ id }) => id === 'generate-image')?.data
          ?.workflow?.kind !== 'generate-image'
      ) {
        return yield* Effect.die(
          new Error('Packed workflow typed actor replacement failed')
        )
      }
    })
  )
)
