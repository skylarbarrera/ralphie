# Plan: Interactive Spec Mode

## Goal
Update `ralph spec` command to support interactive mode where Claude interviews the user using AskUserQuestion, allowing the user to provide answers, review output, and request changes before finalizing the SPEC.

## Files to Modify

### 1. `src/cli.tsx`
- Add new `spec` command to commander
- Options: `<description>` (positional), `--output <path>` (default: SPEC.md)
- Handler calls `runInteractiveSpec()` function

### 2. `src/lib/spec-generator.ts` (already exists)
- Export `runInteractiveSpec()` function
- Spawns claude with create-spec skill and user description
- Uses Ink UI for progress display (reuse existing components where possible)
- Captures generated SPEC content from claude output
- Writes final SPEC to specified output path

### 3. `src/components/SpecGeneratorUI.tsx` (new)
- Ink component for spec generation display
- Shows progress: "Generating SPEC...", "Interviewing user...", "Creating SPEC..."
- Displays generated SPEC content when ready
- Simple status indicator (reuse PhaseIndicator or create minimal version)

## Implementation Steps

1. **Add spec command to CLI** (`src/cli.tsx`)
   - Register `spec <description>` command
   - Add `--output` option (default: SPEC.md)
   - Call `runInteractiveSpec(description, outputPath)`

2. **Implement runInteractiveSpec()** (`src/lib/spec-generator.ts`)
   - Spawn claude process with skill invocation: `/create-spec`
   - Pass user description via stdin or prompt
   - Parse output to extract SPEC content
   - Handle errors and edge cases
   - Write SPEC to output file

3. **Create SpecGeneratorUI component** (if needed for progress display)
   - Minimal UI showing current phase
   - Success/error messaging
   - Option: reuse existing components (PhaseIndicator, StatusBar)

## Tests

- Unit tests for `runInteractiveSpec()` function
  - Mock claude spawn
  - Verify SPEC content extraction
  - Verify file writing
- Integration test: spawn actual claude with create-spec skill (optional, may be slow)
- CLI test: verify `ralph spec` command registration and options

## Exit Criteria

- [x] `ralph spec "description"` command exists
- [x] Command spawns claude with `/create-spec` skill
- [x] Claude interviews user using AskUserQuestion (built into skill)
- [x] Generated SPEC written to SPEC.md (or custom path via --output)
- [x] Tests pass
- [x] Type check passes
