import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { checkPackageArchive } from './package-archive'

const temporaryDirectories: string[] = []

const createArchive = (files: readonly string[]): string => {
  const directory = mkdtempSync(path.join(tmpdir(), 'flow-package-archive-'))
  temporaryDirectories.push(directory)

  for (const file of files) {
    const filePath = path.join(directory, file)
    mkdirSync(path.dirname(filePath), { recursive: true })
    writeFileSync(filePath, '')
  }

  const archivePath = path.join(directory, 'package.tgz')

  const packed = spawnSync('tar', ['-czf', archivePath, 'package'], {
    cwd: directory,
    encoding: 'utf-8',
  })

  if (packed.status !== 0) {
    throw new Error(packed.stderr ?? packed.error?.message ?? 'tar failed')
  }

  return archivePath
}

describe('package archive allowlist', () => {
  afterEach(() => {
    for (const directory of temporaryDirectories.splice(0)) {
      rmSync(directory, { force: true, recursive: true })
    }
  })

  it('accepts package metadata and built output', () => {
    const archive = createArchive([
      'package/package.json',
      'package/README.md',
      'package/dist/public.js',
      'package/dist/public.d.ts',
    ])

    expect(() => checkPackageArchive(archive, '@flow/example')).not.toThrow()
  })

  it('rejects research files at the package root', () => {
    const archive = createArchive([
      'package/package.json',
      'package/dist/public.js',
      'package/research/PROGRESS.md',
    ])

    expect(() => checkPackageArchive(archive, '@flow/example')).toThrow(
      'package/research/PROGRESS.md'
    )
  })

  it('rejects source, demo, and research directories even inside dist', () => {
    const archive = createArchive([
      'package/package.json',
      'package/dist/public.js',
      'package/dist/src/main.ts',
      'package/dist/demo/main.js',
      'package/dist/research/trace.md',
    ])

    expect(() => checkPackageArchive(archive, '@flow/example')).toThrow(
      /dist\/(?:src|demo|research)\//u
    )
  })
})
