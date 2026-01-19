# Changelog

All notable changes to Ralphie will be documented in this file.

## [1.1.0] - 2026-01-19

### Added
- **V2 Spec Format** - Structured specs with task IDs (T001, T002), status tracking, size estimates, and deliverables
- **Spec Locator** - Automatic discovery of specs in `specs/active/` directory
- **Spec Archival** - `ralphie archive` moves completed specs to `specs/completed/` with timestamps
- **Spec Status Command** - `ralphie status` shows progress of active spec
- **Spec List Command** - `ralphie spec-list` shows active and completed specs
- **OpenCode Harness** - Support for OpenCode AI provider

### Changed
- Interactive UI now uses V2 spec parser with task ID display
- Headless runner uses V2 format with proper status transitions
- Spec generator creates V2 format by default

### Removed
- **V1 checkbox spec format** - Only V2 format with task IDs is now supported

## [1.0.0] - 2025-01-16

### Added
- **Core loop execution** - Run AI in a loop until SPEC is complete
- **SPEC generation** - AI-powered interview to create structured specs
- **Multi-AI support** - Harness abstraction for Claude and Codex
- **Greedy mode** - Complete multiple tasks per iteration (`--greedy`)
- **Headless mode** - JSON output for CI/CD automation (`--headless`)
- **Stuck detection** - Exit when no progress after N iterations
- **Interactive TUI** - Real-time progress display with Ink
- **Project scaffolding** - `ralphie init` sets up project structure
- **SPEC validation** - `ralphie validate` checks format

### Harnesses
- Claude Code (default)
- OpenAI Codex

### Requirements
- Bun runtime
- Claude Code CLI or Codex CLI
- Git
