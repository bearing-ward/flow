import { defineConfig } from "@playwright/test";

export default defineConfig({
  outputDir: "./test-results",
  testDir: "./apps/vanilla/e2e",
  testMatch: "**/*.e2e.ts",
  use: {
    baseURL: "http://127.0.0.1:4173",
    viewport: { height: 640, width: 960 },
  },
  webServer: {
    command: "OTEL_SDK_DISABLED=true bun run dev",
    reuseExistingServer: true,
    url: "http://127.0.0.1:4173",
  },
});
