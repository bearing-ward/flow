#!/usr/bin/env bun
import { Effect } from 'effect'

import { serveFlowImages } from './public.ts'

const program = Effect.scoped(
  Effect.gen(function* main() {
    yield* serveFlowImages({
      timeoutMs: Number(process.env.FLOW_IMAGE_TIMEOUT_MS ?? 15_000),
      hostname: process.env.FLOW_IMAGE_BIND ?? '127.0.0.1',
      port: Number(process.env.FLOW_IMAGE_PORT ?? 4191),
      origins: {
        vanilla:
          process.env.FLOW_IMAGE_VANILLA_ORIGIN ?? 'http://127.0.0.1:4176',
        vue: process.env.FLOW_IMAGE_VUE_ORIGIN ?? 'http://127.0.0.1:4177',
        foldkit:
          process.env.FLOW_IMAGE_FOLDKIT_ORIGIN ?? 'http://127.0.0.1:4178',
      },
    })
    yield* Effect.never
  })
)

const fiber = Effect.runFork(program)

process.once('SIGINT', () => fiber.interruptUnsafe())

process.once('SIGTERM', () => fiber.interruptUnsafe())
