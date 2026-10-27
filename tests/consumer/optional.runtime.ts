import { readFileSync } from 'node:fs'

import { acquireYjsRoom, FlowRoomError } from '@flow/collaboration-yjs'
import type { FlowRoomOptions } from '@flow/collaboration-yjs'
import { FlowRouter } from '@flow/core'
import type { FlowRouterService } from '@flow/core'
import { createFlowImageService, serveFlowImages } from '@flow/image-service'
import type { FlowImageServiceOptions } from '@flow/image-service'
import {
  createLibavoidRouter,
  libavoidRouterLayer,
} from '@flow/routing-libavoid'
import { Effect, Result, Layer } from 'effect'

const wasmUrl = import.meta.resolve('@flow/routing-libavoid/libavoid.wasm')

const magic = [...readFileSync(new URL(wasmUrl)).subarray(0, 8)]

if (JSON.stringify(magic) !== '[0,97,115,109,1,0,0,0]') {
  throw new Error('Packed libavoid WASM export is missing or invalid')
}

const router: FlowRouterService = createLibavoidRouter({ wasmUrl })

const provided = Effect.runSync(
  FlowRouter.pipe(Effect.provide(libavoidRouterLayer({ wasmUrl })))
)

if (
  router.route === undefined ||
  provided.route === undefined ||
  !Layer.isLayer(libavoidRouterLayer({ wasmUrl }))
) {
  throw new Error('Packed routing service or layer is unusable')
}

const room: FlowRoomOptions = {
  serverUrl: 'https://invalid.example',
  room: 'offline',
  actorId: 'consumer',
  name: 'Consumer',
}

const rejectedRoom = await Effect.runPromise(
  acquireYjsRoom(room).pipe(Effect.scoped, Effect.result)
)

if (
  !Result.isFailure(rejectedRoom) ||
  !(rejectedRoom.failure instanceof FlowRoomError) ||
  rejectedRoom.failure.operation !== 'acquire'
) {
  throw new Error(
    'Packed collaboration did not reject an invalid transport before acquisition'
  )
}

const options: FlowImageServiceOptions = {
  origins: {
    vanilla: 'file:///invalid',
    vue: 'file:///invalid',
    foldkit: 'file:///invalid',
  },
}

await Promise.all(
  [
    createFlowImageService(options).pipe(Effect.asVoid),
    serveFlowImages({ ...options, port: 4199 }).pipe(Effect.asVoid),
  ].map(async (service) => {
    const rejected = await Effect.runPromise(
      service.pipe(Effect.scoped, Effect.result)
    )

    if (
      !Result.isFailure(rejected) ||
      rejected.failure.reason !== 'unavailable'
    ) {
      throw new Error(
        'Packed image service did not reject an invalid origin before launching Chromium'
      )
    }
  })
)
