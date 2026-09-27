import { defineConfig } from 'oxfmt'
import ultracite from 'ultracite/oxfmt'

const localIgnores = [
  '.agent/**',
  '.agents/**',
  '.claude/**',
  '.codex/**',
  '.continue/**',
  '.cursor/**',
  '.gemini/**',
  '.opencode/**',
  '.pi/**',
  '.roo/**',
  '.windsurf/**',
  'apps/vanilla/dist/**',
  'research/artifacts/**',
  'research/generated/**',
  'docs/api-reference.md',
  'tools/oxlint/anti-slop/**',
]

export default defineConfig({
  ...ultracite,
  semi: false,
  singleQuote: true,
  orderImports: 'norder',
  arrowParens: 'always',
  ignorePatterns: [...ultracite.ignorePatterns, ...localIgnores],
})
