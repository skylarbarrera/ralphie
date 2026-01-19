# Changelog

## [1.1.0] - 2026-01-19

### Added
- **V2 Spec Format**: New structured spec format with task IDs, status tracking, and acceptance criteria
- **OpenCode Harness** (experimental): Support for OpenCode as an alternative AI backend (`--harness opencode`)
- **Codex Harness** (experimental): Support for OpenAI Codex as an alternative AI backend (`--harness codex`)
- **Legacy Spec Warning**: Yellow UI banner and console warning when using V1 spec format
- **Harness Env Validation**: Upfront validation of required environment variables with shell-specific setup hints

### Changed
- **Component Refactoring**: Major codebase reorganization for maintainability
  - `App.tsx` reduced from 446 lines to 72 lines
  - Extracted `IterationView` component for UI rendering
  - Extracted `IterationRunner` component for orchestration logic
  - Extracted `failure-context.ts` for error context helpers
  - Extracted `prompts.ts` for prompt constants
  - Extracted `run-interactive.tsx` for interactive command execution
- **Spec Parser**: Migrated to V2 parser with backwards compatibility for V1 specs

### Fixed
- **Tool Display Names**: Tool calls now show readable names (e.g., "Writing plan.md") instead of raw JSON blobs

### Technical
- 621 tests passing
- TypeScript strict mode compliance
- Harness abstraction layer for multi-AI support

### Environment Variables

| Harness | Required Env Var |
|---------|------------------|
| `claude` (default) | `ANTHROPIC_API_KEY` |
| `codex` | `OPENAI_API_KEY` |
| `opencode` | `OPENCODE_SERVER_URL` or `OPENCODE_API_KEY` |
