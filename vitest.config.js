// Minimal vitest config for the standalone
// @real-signal/mcp-plugin-neighborhood-sense package. Does NOT inherit
// the parent monorepo's setup — the package is intentionally
// minimal-dependency (only vitest as dev + @modelcontextprotocol/sdk
// as runtime peer) and runs in isolation when extracted to its own
// repo for the Anthropic Connectors Directory submission.
//
// Same shape as external/attention-ethics/vitest.config.js.

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    setupFiles: [],
    include: ['src/**/*.test.js'],
    environment: 'node',
  },
})
