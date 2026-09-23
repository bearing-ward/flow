import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

const localIgnores = [
  ".agent/**",
  ".agents/**",
  ".claude/**",
  ".codex/**",
  ".continue/**",
  ".cursor/**",
  ".gemini/**",
  ".opencode/**",
  ".pi/**",
  ".roo/**",
  ".windsurf/**",
  "apps/vanilla/dist/**",
  "research/artifacts/**",
  "research/generated/**",
  "tools/oxlint/anti-slop/**",
];

export default defineConfig({
  ...ultracite,
  ignorePatterns: [...ultracite.ignorePatterns, ...localIgnores],
});
