import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from '@playwright/test'
import type { Page, WebSocket as PlaywrightWebSocket } from '@playwright/test'
import { Schema } from 'effect'

declare global {
  interface Window {
    __flowFoldkitHmr?: {
      readonly setStatus: (status: string) => Promise<void>
      readonly runtimeId: string
    }
  }
}

const root = fileURLToPath(new URL('../', import.meta.url))

const fixture = path.join(root, 'tests/consumer/foldkit-hmr')

const temp = mkdtempSync(path.join(tmpdir(), 'flow-foldkit-hmr-'))

const tarballs = path.join(temp, 'tarballs')

const consumerRoot = path.join(temp, 'consumer')

const run = (command: string, args: readonly string[], cwd: string): void => {
  const result = Bun.spawnSync([command, ...args], {
    cwd,
    stderr: 'inherit',
    stdout: 'inherit',
  })

  if (result.exitCode !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} failed in ${cwd} with exit code ${result.exitCode}`
    )
  }
}

const pack = (packagePath: string): string => {
  const result = Bun.spawnSync(
    ['bun', 'pm', 'pack', '--destination', tarballs, '--quiet'],
    { cwd: path.join(root, packagePath), stderr: 'pipe', stdout: 'pipe' }
  )

  const output = result.stdout.toString().trim()

  const filename = output
    .split(/[\\/\r\n]/u)
    .findLast((segment) => segment.length > 0)

  if (result.exitCode !== 0 || filename === undefined) {
    throw new Error(
      `bun pm pack failed for ${packagePath}: ${result.stderr.toString()}`
    )
  }

  return filename
}

const observeWebSocket = (
  page: Page,
  frames: string[],
  direction: 'sent' | 'received'
): void => {
  page.on('websocket', (socket: PlaywrightWebSocket) => {
    if (direction === 'sent') {
      socket.on('framesent', (frame) => frames.push(frame.payload.toString()))
    } else {
      socket.on('framereceived', (frame) =>
        frames.push(frame.payload.toString())
      )
    }
  })
}

const waitForServer = async (
  serverProcess: ReturnType<typeof Bun.spawn>,
  readyFile: string
): Promise<number> => {
  const { promise, resolve, reject } = Promise.withResolvers<number>()

  const interval = setInterval(() => {
    if (!existsSync(readyFile)) {
      return
    }

    const ready = Schema.decodeUnknownSync(
      Schema.Struct({ port: Schema.Number })
    )(JSON.parse(readFileSync(readyFile, 'utf-8')))

    resolve(ready.port)
  }, 25)

  const timeout = setTimeout(
    () =>
      reject(new Error('Timed out waiting for temporary Vite server startup')),
    15_000
  )

  const watchServerExit = async (): Promise<void> => {
    const exitCode = await serverProcess.exited

    if (!existsSync(readyFile)) {
      reject(
        new Error(`Temporary Vite server exited before startup: ${exitCode}`)
      )
    }
  }

  void watchServerExit()

  try {
    return await promise
  } finally {
    clearInterval(interval)
    clearTimeout(timeout)
  }
}

const openConsumer = async (
  browser: Awaited<ReturnType<typeof chromium.launch>>,
  configFile: string,
  cacheDir: string
) => {
  const readyFile = `${cacheDir}.ready.json`

  const serverProcess = Bun.spawn(
    [
      'node',
      path.join(root, 'scripts/foldkit-hmr-server.mjs'),
      consumerRoot,
      configFile,
      cacheDir,
      readyFile,
    ],
    { cwd: root, stderr: 'inherit', stdout: 'ignore', stdin: 'ignore' }
  )

  try {
    const port = await waitForServer(serverProcess, readyFile)

    const page = await browser.newPage()
    page.setDefaultTimeout(10_000)
    page.setDefaultNavigationTimeout(10_000)
    const errors: string[] = []
    const warnings: string[] = []
    const sentFrames: string[] = []
    const receivedFrames: string[] = []
    const navigations: string[] = []

    page.on('pageerror', (error) => errors.push(error.message))

    page.on('console', (message) => {
      if (message.type() === 'error') {
        errors.push(message.text())
      }

      if (message.type() === 'warning') {
        warnings.push(message.text())
      }
    })

    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) {
        navigations.push(frame.url())
      }
    })
    observeWebSocket(page, sentFrames, 'sent')
    observeWebSocket(page, receivedFrames, 'received')

    await page.goto(`http://127.0.0.1:${port}/`)
    await page.locator('[data-status="hmr-node"]').waitFor()
    await page.waitForFunction(() => window.__flowFoldkitHmr !== undefined)

    return {
      errors,
      navigations,
      page,
      receivedFrames,
      sentFrames,
      stop: async () => {
        serverProcess.kill('SIGTERM')
        await serverProcess.exited
      },
      warnings,
    }
  } catch (error) {
    serverProcess.kill('SIGTERM')
    await serverProcess.exited
    throw error
  }
}

const assertEventFrame = (
  frames: string[],
  name: string,
  direction: string
): void => {
  if (!frames.some((frame) => frame.includes(`"event":"${name}"`))) {
    throw new Error(`Foldkit ${direction} did not include ${name}`)
  }
}

const assertNoErrors = (errors: readonly string[], stage: string): void => {
  if (errors.length > 0) {
    throw new Error(`${stage} browser errors: ${errors.join('; ')}`)
  }
}

const main = async (): Promise<void> => {
  mkdirSync(tarballs, { recursive: true })
  mkdirSync(consumerRoot, { recursive: true })

  try {
    const archives = {
      core: pack('packages/core'),
      foldkit: pack('packages/foldkit'),
    }

    const archivePath = (name: keyof typeof archives) =>
      `file:${path.relative(consumerRoot, path.join(tarballs, archives[name]))}`

    writeFileSync(
      path.join(consumerRoot, 'package.json'),
      JSON.stringify(
        {
          name: 'flow-packed-foldkit-hmr-consumer',
          private: true,
          type: 'module',
          dependencies: {
            '@effect/platform-browser': '4.0.0-rc.116',
            '@flow/core': archivePath('core'),
            '@flow/foldkit': archivePath('foldkit'),
            '@foldkit/vite-plugin': '0.24.0',
            effect: '4.0.0-rc.116',
            foldkit: '0.163.0',
            vite: '8.0.13',
          },
          overrides: { '@flow/core': archivePath('core') },
        },
        null,
        2
      )
    )

    for (const file of [
      'index.html',
      'main.ts',
      'revision.ts',
      'vite.config.ts',
      'vite.no-plugin.config.ts',
    ]) {
      const destination = path.join(consumerRoot, file)

      mkdirSync(path.dirname(destination), { recursive: true })
      copyFileSync(path.join(fixture, file), destination)
    }

    run('bun', ['install', '--no-save', '--no-progress'], consumerRoot)
    const browser = await chromium.launch()

    try {
      const enabled = await openConsumer(
        browser,
        path.join(consumerRoot, 'vite.config.ts'),
        path.join(consumerRoot, 'node_modules', '.vite-hmr-enabled')
      )

      try {
        assertEventFrame(enabled.sentFrames, 'foldkit:request-model', 'client')
        assertEventFrame(
          enabled.receivedFrames,
          'foldkit:restore-model',
          'server'
        )
        await enabled.page.waitForTimeout(1500)

        const navigationCountAfterColdStart = () => enabled.navigations.length

        if (navigationCountAfterColdStart() !== 1) {
          throw new Error(
            `Cold start caused ${navigationCountAfterColdStart() - 1} reloads before edits`
          )
        }

        if (
          enabled.warnings.some((warning) =>
            warning.includes('No response from @foldkit/vite-plugin')
          )
        ) {
          throw new Error('Plugin-enabled cold start reported a missing plugin')
        }

        const before = await enabled.page.evaluate(() => {
          const canvas = document.querySelector<HTMLElement>('#canvas')

          const state = document.querySelector<HTMLElement>(
            '[data-status="hmr-node"]'
          )

          if (canvas === null || state === null) {
            throw new Error('Missing mounted Foldkit Runtime before reload')
          }

          return {
            bootCount: canvas.dataset['bootCount'],
            runtimeId: canvas.dataset['runtimeId'],
            status: state.textContent,
          }
        })

        if (before.bootCount !== '1' || before.status !== 'initial') {
          throw new Error(
            `Unexpected packed Foldkit cold state: ${JSON.stringify(before)}`
          )
        }

        await enabled.page.evaluate(async () => {
          await window.__flowFoldkitHmr?.setStatus('preserved-by-vite')
        })
        await enabled.page.waitForFunction(
          () =>
            document.querySelector('[data-status="hmr-node"]')?.textContent ===
            'preserved-by-vite'
        )

        const revisionPath = path.join(consumerRoot, 'revision.ts')
        writeFileSync(
          revisionPath,
          "export const revision = 'edited-revision'\n"
        )

        await enabled.page.waitForFunction(
          () =>
            document.querySelector('[data-revision]')?.textContent ===
              'edited-revision' &&
            document.querySelector('[data-status="hmr-node"]')?.textContent ===
              'preserved-by-vite' &&
            document.querySelector<HTMLElement>('#canvas')?.dataset[
              'bootCount'
            ] === '2',
          undefined,
          { timeout: 15_000 }
        )
        await enabled.page.waitForTimeout(1000)

        const after = await enabled.page.evaluate(() => {
          const canvas = document.querySelector<HTMLElement>('#canvas')

          const state = document.querySelector<HTMLElement>(
            '[data-status="hmr-node"]'
          )

          if (canvas === null || state === null) {
            throw new Error(
              'Missing reinitialized Foldkit Runtime after reload'
            )
          }

          return {
            bootCount: canvas.dataset['bootCount'],
            runtimeId: canvas.dataset['runtimeId'],
            status: state.textContent,
          }
        })

        if (
          navigationCountAfterColdStart() !== 2 ||
          after.bootCount !== '2' ||
          after.runtimeId === before.runtimeId ||
          after.status !== 'preserved-by-vite'
        ) {
          throw new Error(
            `Unexpected HMR reload outcome: ${JSON.stringify({ before, after, navigations: navigationCountAfterColdStart() })}`
          )
        }

        assertEventFrame(enabled.sentFrames, 'foldkit:preserve-model', 'client')
        assertEventFrame(enabled.sentFrames, 'foldkit:request-model', 'client')
        assertEventFrame(
          enabled.receivedFrames,
          'foldkit:restore-model',
          'server'
        )
        assertNoErrors(enabled.errors, 'Plugin-enabled HMR')
        console.log(
          'Foldkit packed HMR passed cold start, one full reload, WS preserve/request/restore, semantic state restoration, and Runtime reinitialization'
        )
      } finally {
        await enabled.page.close()
        await enabled.stop()
      }

      const disabled = await openConsumer(
        browser,
        path.join(consumerRoot, 'vite.no-plugin.config.ts'),
        path.join(consumerRoot, 'node_modules', '.vite-hmr-disabled')
      )

      try {
        await disabled.page.waitForFunction(
          () =>
            document.querySelector('[data-status="hmr-node"]')?.textContent ===
            'initial'
        )
        await disabled.page.waitForTimeout(750)

        if (
          !disabled.warnings.some((warning) =>
            warning.includes('No response from @foldkit/vite-plugin')
          )
        ) {
          throw new Error(
            'Plugin-absent path did not warn about missing Model preservation'
          )
        }

        if (disabled.navigations.length !== 1) {
          throw new Error(
            `Plugin-absent cold start caused ${disabled.navigations.length - 1} unexpected reloads`
          )
        }

        assertNoErrors(disabled.errors, 'Plugin-absent cold start')
        console.log(
          'Foldkit packed HMR passed plugin-absent warning and normal initial-state boot'
        )
      } finally {
        await disabled.page.close()
        await disabled.stop()
      }
    } finally {
      await browser.close()
    }
  } finally {
    rmSync(temp, { force: true, recursive: true })
  }
}

await main()
