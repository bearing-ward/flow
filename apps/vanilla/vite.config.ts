import { fileURLToPath } from 'node:url'

import { defineConfig, loadEnv } from 'vite'

import { upstreamFixtureRoute } from '../shared/upstream/vite.ts'

const workspaceRoot = fileURLToPath(new URL('../..', import.meta.url))

const firstConfigured = (...values: readonly (string | undefined)[]): string =>
  values.find((value) => value !== undefined && value.length > 0) ?? ''

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, workspaceRoot, '')

  const telemetryDisabled =
    process.env.OTEL_SDK_DISABLED === 'true' ||
    environment.OTEL_SDK_DISABLED === 'true'

  return {
    build: {
      rolldownOptions: {
        input: {
          main: fileURLToPath(new URL('index.html', import.meta.url)),
          clipboard: `${import.meta.dirname}/clipboard/index.html`,
          helperLines: `${import.meta.dirname}/helper-lines/index.html`,
          history: fileURLToPath(
            new URL('history/index.html', import.meta.url)
          ),
          schemaStudio: fileURLToPath(
            new URL('schema-studio/index.html', import.meta.url)
          ),
        },
      },
    },
    plugins: [
      upstreamFixtureRoute(),
      {
        name: 'flow-ui-recipes-routes',
        configureServer(server) {
          server.middlewares.use((request, response, next) => {
            if (
              request.url === '/ui-recipes/status-indicator' ||
              request.url === '/ui-recipes/appendix'
            ) {
              const route = request.url.slice(1)
              response.statusCode = 308
              response.setHeader('Location', `/${route}/`)
              response.end()

              return
            }

            next()
          })
        },
      },
    ],
    define: {
      'import.meta.env.VITE_OTEL_EXPORTER_OTLP_ENDPOINT': JSON.stringify(
        telemetryDisabled
          ? ''
          : firstConfigured(
              environment.VITE_OTEL_EXPORTER_OTLP_ENDPOINT,
              environment.OTEL_EXPORTER_OTLP_ENDPOINT
            )
      ),
      'import.meta.env.VITE_OTEL_EXPORT_INTERVAL_MS': JSON.stringify(
        firstConfigured(environment.VITE_OTEL_EXPORT_INTERVAL_MS)
      ),
      'import.meta.env.VITE_OTEL_SERVICE_NAME': JSON.stringify(
        firstConfigured(
          environment.VITE_OTEL_SERVICE_NAME,
          environment.OTEL_SERVICE_NAME
        )
      ),
      'import.meta.env.VITE_OTEL_SERVICE_VERSION': JSON.stringify(
        firstConfigured(
          environment.VITE_OTEL_SERVICE_VERSION,
          environment.OTEL_SERVICE_VERSION
        )
      ),
    },
    envDir: workspaceRoot,
  }
})
