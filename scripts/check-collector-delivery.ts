import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from '@playwright/test'
import { Effect, Schema } from 'effect'

import type * as CollectorBrowser from '../research/harnesses/telemetry/browser.ts'
import { queryCollectorDelivery } from './collector-delivery-query.ts'

const image =
  'otel/opentelemetry-collector-contrib:0.123.0@sha256:e39311df1f3d941923c00da79ac7ba6269124a870ee87e3c3ad24d60f8aee4d2'

const root = fileURLToPath(new URL('../', import.meta.url))

const runId = crypto.randomUUID()

const name = `flow-collector-${runId}`

const stopped = process.argv.includes('--stopped-collector')

const bounded = async <T>(
  promise: Promise<T>,
  milliseconds: number,
  context: string
): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined

  try {
    return await Promise.race([
      promise,
      (() => {
        const timeout = Promise.withResolvers<never>()
        timer = setTimeout(
          () =>
            timeout.reject(new Error(`${context} exceeded ${milliseconds}ms`)),
          milliseconds
        )

        return timeout.promise
      })(),
    ])
  } finally {
    clearTimeout(timer)
  }
}

const command = async (
  args: readonly string[],
  timeout = 20_000
): Promise<string> => {
  const child = Bun.spawn(['docker', ...args], {
    stdout: 'pipe',
    stderr: 'pipe',
  })

  try {
    const [code, stdout, stderr] = await bounded(
      Promise.all([
        child.exited,
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
      ]),
      timeout,
      `docker ${args[0]}`
    )

    if (code !== 0) {
      throw new Error(`docker ${args[0]} failed (${code}): ${stderr}`)
    }

    return stdout.trim()
  } catch (error) {
    child.kill()
    throw error
  }
}

const lines = async (
  filename: string
): Promise<(typeof Schema.Json.Type)[]> => {
  let contents: string

  try {
    contents = await readFile(filename, 'utf-8')
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return []
    }

    throw error
  }

  // The collector can be writing its last record: query only complete JSON lines.
  return contents
    .split('\n')
    .slice(0, -1)
    .filter(Boolean)
    .map((line) => Schema.decodeUnknownSync(Schema.Json)(JSON.parse(line)))
}

const poll = async <T>(
  operation: () => Promise<T>,
  context: string
): Promise<T> => {
  const deadline = Date.now() + 30_000
  let last: unknown

  while (Date.now() < deadline) {
    try {
      // Sequential polling observes successive collector states, never concurrent probes.
      // oxlint-disable-next-line eslint/no-await-in-loop
      return await operation()
    } catch (error) {
      last = error
    }

    // oxlint-disable-next-line eslint/no-await-in-loop
    await Bun.sleep(200)
  }

  throw new Error(
    `${context}: ${last instanceof Error ? last.message : String(last)}`
  )
}

const run = async () => {
  const artifacts = await mkdtemp(
    path.join(tmpdir(), 'flow-collector-delivery-')
  )

  const config = path.join(artifacts, 'collector.yaml')
  const traces = path.join(artifacts, 'traces.jsonl')
  const logs = path.join(artifacts, 'logs.jsonl')
  console.log(`Collector run ${runId}; retained evidence: ${artifacts}`)
  await writeFile(
    config,
    `receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318
        cors:
          allowed_origins: ["*"]
processors:
  batch:
    timeout: 100ms
exporters:
  file/traces:
    path: /evidence/traces.jsonl
    flush_interval: 100ms
  file/logs:
    path: /evidence/logs.jsonl
    flush_interval: 100ms
extensions:
  health_check:
    endpoint: 0.0.0.0:13133
service:
  extensions: [health_check]
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [file/traces]
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [file/logs]
`
  )
  let failure: Error | undefined

  let startupAttempted = false
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
  let server: ReturnType<typeof Bun.spawn> | undefined

  try {
    await command(['version', '--format', '{{.Server.Version}}'])
    // Explicit pull timeout: missing daemon/image is a gate failure, never a skip.
    await command(['pull', image], 120_000)
    startupAttempted = true
    await command([
      'run',
      '--detach',
      '--name',
      name,
      '--user',
      '0:0',
      '--publish',
      '127.0.0.1::4318',
      '--publish',
      '127.0.0.1::13133',
      '--mount',
      `type=bind,source=${artifacts},target=/evidence`,
      image,
      '--config=/evidence/collector.yaml',
    ])
    const endpoint = `http://${await command(['port', name, '4318/tcp'])}`
    const health = `http://${await command(['port', name, '13133/tcp'])}`
    await poll(async () => {
      const response = await fetch(health, {
        signal: AbortSignal.timeout(1000),
      })

      if (!response.ok) {
        throw new Error(`Collector health ${response.status}`)
      }
    }, 'Collector did not become healthy')

    if (stopped) {
      await command(['stop', '--time', '2', name])
    }

    const readyFile = path.join(artifacts, 'vite-ready.json')

    server = Bun.spawn(
      [
        'bun',
        'run',
        path.join(root, 'scripts/collector-delivery-vite.ts'),
        readyFile,
      ],
      { cwd: root, stdout: 'ignore', stderr: 'inherit' }
    )

    const url = await poll(async () => {
      if (server?.exitCode !== null) {
        throw new Error('Vite process terminated before readiness')
      }

      const ready = Schema.decodeUnknownSync(
        Schema.Struct({ url: Schema.String })
      )(JSON.parse(await readFile(readyFile, 'utf-8')))

      return ready.url
    }, 'Vite startup readiness timed out')

    browser = await chromium.launch({ timeout: 20_000 })

    const page = await bounded(
      browser.newPage(),
      10_000,
      'Browser page creation'
    )

    page.setDefaultTimeout(10_000)
    page.setDefaultNavigationTimeout(10_000)
    await page.goto(url)
    await bounded(
      page.evaluate(
        async ({ endpoint: browserEndpoint, serviceName }) => {
          const fixturePath = '/browser.ts'

          const fixture: typeof CollectorBrowser = await import(fixturePath)

          await fixture.start(browserEndpoint, serviceName)
        },
        { endpoint, serviceName: name }
      ),
      30_000,
      'Production workflows and runtime flush'
    )
    const node = page.locator('[data-node-id="collector-node"]')
    await node.hover()
    await page.mouse.down()
    await node.dispatchEvent('pointercancel', {
      pointerId: 1,
      button: 0,
      bubbles: true,
    })
    await page.mouse.up()
    await bounded(
      page.evaluate(async () => {
        const fixturePath = '/browser.ts'

        const fixture: typeof CollectorBrowser = await import(fixturePath)

        await fixture.finish()
      }),
      30_000,
      'Host teardown and runtime flush'
    )

    const report = await poll(async () => {
      const running = await command([
        'inspect',
        '--format',
        '{{.State.Running}}',
        name,
      ])

      if (running !== 'true') {
        throw new Error('Collector is stopped; delivery gate fails')
      }

      const [traceLines, logLines] = await Promise.all([
        lines(traces),
        lines(logs),
      ])

      return queryCollectorDelivery(traceLines, logLines, name)
    }, 'Missing queryable retained collector output after shutdown flush')

    // Stop the collector to establish that its exporter flushed durable evidence.
    await command(['stop', '--time', '3', name])

    const retained = queryCollectorDelivery(
      await lines(traces),
      await lines(logs),
      name
    )

    await writeFile(
      path.join(artifacts, 'report.json'),
      JSON.stringify(
        {
          runId,
          image,
          scope: 'Vanilla production composition',
          report,
          retained,
          passed: true,
        },
        null,
        2
      )
    )
    console.log(JSON.stringify(retained, null, 2))
  } catch (error) {
    await writeFile(
      path.join(artifacts, 'failure.json'),
      JSON.stringify(
        {
          runId,
          image,
          stoppedCollectorMode: stopped,
          passed: false,
          message: error instanceof Error ? error.message : String(error),
        },
        null,
        2
      )
    )
    failure = error instanceof Error ? error : new Error(String(error))
  } finally {
    const cleanup = await Promise.allSettled([
      (async () => {
        if (startupAttempted) {
          const errors: unknown[] = []

          try {
            await writeFile(
              path.join(artifacts, 'collector.log'),
              await command(['logs', name])
            )
          } catch (error) {
            if (
              !(error instanceof Error) ||
              !error.message.includes('No such container')
            ) {
              errors.push(error)
            }
          }

          try {
            await command(['rm', '--force', name])
          } catch (error) {
            if (
              !(error instanceof Error) ||
              !error.message.includes('No such container')
            ) {
              errors.push(error)
            }
          }

          if (errors.length > 0) {
            throw new AggregateError(
              errors,
              'Collector container cleanup failed'
            )
          }
        }
      })(),
      (async () => {
        try {
          if (browser !== undefined) {
            await bounded(browser.close(), 10_000, 'Chromium cleanup')
          }
        } finally {
          if (server !== undefined) {
            server.kill('SIGTERM')

            try {
              await bounded(server.exited, 10_000, 'Vite process cleanup')
            } catch {
              server.kill('SIGKILL')
              await bounded(
                server.exited,
                10_000,
                'Forced Vite process cleanup'
              )
            }
          }
        }
      })(),
    ])

    const failures = cleanup.flatMap((result) =>
      result.status === 'rejected' ? [result.reason] : []
    )

    await writeFile(
      path.join(artifacts, 'cleanup.json'),
      JSON.stringify(
        {
          container: name,
          passed: failures.length === 0,
          failureCount: failures.length,
          failures: failures.map((error) =>
            error instanceof Error ? error.message : String(error)
          ),
        },
        null,
        2
      )
    )

    if (failures.length > 0) {
      failure = new AggregateError(
        failure === undefined ? failures : [failure, ...failures],
        'Collector gate cleanup failed'
      )
    }
  }

  if (failure !== undefined) {
    throw failure
  }
}

await Effect.runPromise(
  Effect.tryPromise({
    try: run,
    catch: (cause) => new Error('Collector delivery gate failed', { cause }),
  })
)
