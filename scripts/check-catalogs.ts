import { BunRuntime, BunServices } from '@effect/platform-bun'
import { Effect } from 'effect'

import { memberContracts } from './check-api-member-contracts.ts'
import { apiMembers } from './check-api-members.ts'
import { exampleRecipes } from './check-example-recipes.ts'
import { proofMatrix } from './check-proof-matrix.ts'
import { catalogCoverage } from './check-react-flow-catalog.ts'

const program = Effect.gen(function* checkCatalogs() {
  yield* catalogCoverage
  yield* apiMembers
  yield* memberContracts
  yield* proofMatrix
  yield* Effect.tryPromise(exampleRecipes)
})

BunRuntime.runMain(program.pipe(Effect.provide(BunServices.layer)))
