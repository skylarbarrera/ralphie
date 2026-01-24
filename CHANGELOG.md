# Changelog

## [1.2.0] - 2026-01-22

### Added
- **Skills.sh Integration**: Research phase now fetches domain expertise from [skills.sh](https://skills.sh) API
  - Automatically detects tech stack (React, Next.js, Expo, FastAPI, etc.)
  - Fetches 2-3 relevant skill guides (45+ rules for React best practices, etc.)
  - Uses GitHub API to discover SKILL.md files in repositories
  - Gracefully falls back to WebSearch if skills unavailable
- **Parallel Research Execution**: Repository and best-practices research run concurrently (saves ~49s)
- **Research Logging**: Structured logs in `.ralphie/logs/research/` with timestamps and agent status
- **Iteration Logging**: Session logs in `.ralphie/logs/iterations/` for debugging and analysis
- **`ralphie logs`**: New command to view iteration logs with filtering and tail support
- **Terse Docstring Guidance**: Token-efficient documentation style (70-80% reduction vs Google/NumPy style)
  - Type hints document parameters/returns instead of verbose Args/Returns sections
  - Added to `.claude/CLAUDE.md` coding standards
  - Applied to spec generator and iteration prompts

### Changed
- **Research Timeout**: Increased from 90s to 180s to accommodate skills.sh fetch + WebSearch fallback
- **Research Agent Prompt**: Condensed from 280 lines to 189 lines (removed verbose logging instructions)
- **Spec Generator**: Now includes terse docstring guidance in quality requirements
- **Best Practices Researcher**: Streamlined skills.sh integration (96 lines → 8 lines of core logic)

### Improved
- **Research Quality**: Skills.sh provides vetted, framework-specific patterns (e.g., Vercel React Best Practices with 33k+ installs)
- **Code Quality**: Generated code now uses terse docstrings, saving ~1,200 tokens per 50 functions
- **Transparency**: Research process visible through emoji markers and structured logs
- **Reliability**: GitHub API path discovery prevents skills.sh fetch failures from different repo structures

### Technical
- Research agents use raw GitHub URLs instead of git clone (15-20s speedup per skill)
- Fallback patterns for common repo structures: `skills/{name}/`, `{org}/{category}/`, `main` vs `master` branches
- Logging infrastructure supports multiple phases (research, spec, iterations)
- All logging output saved to `.ralphie/logs/` with timestamped JSON format

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
