import { makeLocalWorkflowAiProvider } from '@flow/workflow'
import { Effect } from 'effect'

// The vanilla manifest may not declare optional integrations, so its demos build the provider here.
export const createLocalWorkflowAiProvider = (
  options: Parameters<typeof makeLocalWorkflowAiProvider>[0]
) => Effect.runSync(makeLocalWorkflowAiProvider(options))
