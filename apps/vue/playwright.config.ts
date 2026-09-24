import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts",
  outputDir: "./test-results",
  use: { baseURL: "http://127.0.0.1:4174", viewport: { width: 960, height: 640 } },
  webServer: {
    command: "bun run dev",
    reuseExistingServer: true,
    url: "http://127.0.0.1:4174",
  },
});
