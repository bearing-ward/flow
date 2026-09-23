import { fileURLToPath } from "node:url";

import { defineConfig, loadEnv } from "vite";

const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));

const firstConfigured = (...values: readonly (string | undefined)[]): string =>
  values.find((value) => value !== undefined && value.length > 0) ?? "";

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, workspaceRoot, "");

  const telemetryDisabled =
    process.env.OTEL_SDK_DISABLED === "true" ||
    environment.OTEL_SDK_DISABLED === "true";

  return {
    define: {
      "import.meta.env.VITE_OTEL_EXPORTER_OTLP_ENDPOINT": JSON.stringify(
        telemetryDisabled
          ? ""
          : firstConfigured(
              environment.VITE_OTEL_EXPORTER_OTLP_ENDPOINT,
              environment.OTEL_EXPORTER_OTLP_ENDPOINT
            )
      ),
      "import.meta.env.VITE_OTEL_EXPORT_INTERVAL_MS": JSON.stringify(
        firstConfigured(environment.VITE_OTEL_EXPORT_INTERVAL_MS)
      ),
      "import.meta.env.VITE_OTEL_SERVICE_NAME": JSON.stringify(
        firstConfigured(
          environment.VITE_OTEL_SERVICE_NAME,
          environment.OTEL_SERVICE_NAME
        )
      ),
      "import.meta.env.VITE_OTEL_SERVICE_VERSION": JSON.stringify(
        firstConfigured(
          environment.VITE_OTEL_SERVICE_VERSION,
          environment.OTEL_SERVICE_VERSION
        )
      ),
    },
    envDir: workspaceRoot,
  };
});
