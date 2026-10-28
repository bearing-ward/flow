import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { Effect, Schema as S } from 'effect'

const catalogs = new Map<string, Promise<S.Json>>()

export const loadCatalogJson = (file: string): Promise<S.Json> => {
  const absolute = path.resolve(file)
  const cached = catalogs.get(absolute)

  if (cached !== undefined) {
    return cached
  }

  const contents = readFile(absolute, 'utf-8').then(
    S.decodeUnknownSync(S.fromJsonString(S.Json))
  )

  catalogs.set(absolute, contents)

  return contents
}

export const readCatalogJson = (file: string) =>
  Effect.tryPromise(() => loadCatalogJson(file))
