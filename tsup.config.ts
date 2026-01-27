import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli.tsx'],
  format: ['esm'],
  target: 'node18',
  outDir: 'dist',
  clean: true,
  splitting: false,
  external: [
    '@anthropic-ai/claude-agent-sdk',
    '@openai/codex-sdk',
    '@opencode-ai/sdk',
    'ink',
    'ink-spinner',
    '@inkjs/ui',
    'react',
    'commander',
    'js-yaml',
    'dotenv',
  ],
});
