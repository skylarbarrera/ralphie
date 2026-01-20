# Implementation Plan: Enhanced SPEC System

Generated: 2026-01-18

## Goal

Enhance Ralphie's SPEC system with folder-based history, EARS syntax support, lessons learned tracking, and improved CLI commands while maintaining backward compatibility with the existing single-file `SPEC.md` approach.

## Research Summary

### Industry Context

**Kiro** ([docs](https://kiro.dev/docs/specs/)):
- Uses `.kiro/specs/[feature-name]/` with 3 files: requirements.md, design.md, tasks.md
- Commits specs alongside code for historical reference
- Three-phase workflow: Requirements -> Design -> Tasks

**GitHub Spec Kit** ([repo](https://github.com/github/spec-kit)):
- Uses `.specify/specs/001-feature-name/spec.md` with numbered folders
- Has `constitution.md` for project principles (similar to our lessons.md idea)
- Warns about folder accumulation over time - suggests cleanup strategy
- Uses `[P]` markers for parallel-executable tasks

**EARS Syntax** ([definitive guide](https://qracorp.com/guides_checklists/the-easy-approach-to-requirements-syntax-ears/)):
- Five patterns: Ubiquitous, State-Driven (While), Event-Driven (When), Optional Feature (Where), Unwanted Behavior (If/Then)
- Format: `[preconditions] + [trigger] + system name + response(s)`
- Best for 0-3 preconditions; avoid for mathematical formulas
- Standard in safety-critical industries (aerospace, automotive)

### Key Learnings

1. **Keep it simple** - Spec Kit's 8-file approach is over-engineered for most projects
2. **Folder cleanup matters** - Projects accumulate specs over years; need archive strategy
3. **Lessons persist value** - Both tools emphasize capturing principles/learnings
4. **Backward compatibility is critical** - Users shouldn't be forced to migrate

## Existing Codebase Analysis

### Current Architecture

```
src/lib/
├── spec-parser.ts      # Parses SPEC.md into TaskInfo[] structure
├── spec-validator.ts   # Validates format (no code, no file paths, etc.)
├── spec-generator.ts   # Generates specs via harness (being refactored)
└── config-loader.ts    # Loads ralphie.config.yaml

skills/
├── spec-autonomous/    # Headless spec generation
├── spec-interactive/   # Interview-based generation
├── review-spec/        # Format + content validation
└── ralphie-iterate/    # Main iteration protocol

templates/
├── .claude/skills/     # Skill templates for init
├── .ai/ralphie/        # Plan, index directories
└── RALPHIE.md          # User guide
```

### Key Functions to Modify

**spec-parser.ts**:
- `loadSpecFromDir(dir)` - Currently hardcodes `SPEC.md` path
- `parseSpec(specPath)` - Takes path, returns SpecStructure
- `isSpecComplete(specPath)` - Checks for unchecked tasks

**spec-validator.ts**:
- `validateSpecContent(content)` - Returns violations array
- Patterns: CODE_FENCE, FILE_LINE, SHELL_COMMAND, TECHNICAL_NOTES, IMPLEMENTATION_KEYWORDS
- No EARS validation currently

**commands/run.ts**:
- `validateProject(cwd)` - Checks for SPEC.md, .claude/ralphie.md, .ai/ralphie/

### Patterns to Follow

1. **TypeScript with strict mode** - All existing code uses proper types
2. **Vitest for testing** - Unit tests in `tests/` directory
3. **Commander.js for CLI** - Used for argument parsing
4. **Skill-based architecture** - Logic in skills, thin CLI wrappers

---

## Implementation Phases

### Phase 1: Spec Discovery Layer

**Goal**: Abstract spec location so code works with both `SPEC.md` and `specs/active/` folder.

**Files to create/modify:**
- `src/lib/spec-locator.ts` - NEW: Find active spec(s) in project
- `src/lib/spec-parser.ts` - Update to use locator
- `src/commands/run.ts` - Update validation to use locator

**Steps:**

1. Create `spec-locator.ts` with functions:
   ```
   findActiveSpec(cwd: string): string | null
   findAllSpecs(cwd: string): { active: string[], completed: string[] }
   getSpecsDir(cwd: string): string | null
   isUsingSpecsFolder(cwd: string): boolean
   ```

2. Logic for `findActiveSpec`:
   - Check `specs/active/*.md` first (if folder exists)
   - Fall back to `SPEC.md` in root
   - Return first incomplete spec (has unchecked tasks)

3. Update `loadSpecFromDir` to use `findActiveSpec`

4. Update `validateProject` to check either location

**Tests:**
- Finds SPEC.md when no specs/ folder exists
- Finds spec in specs/active/ when folder exists
- Prefers specs/active/ over root SPEC.md
- Returns null when no specs found

**Acceptance Criteria:**
- [ ] `ralphie run` works with SPEC.md (backward compat)
- [ ] `ralphie run` works with specs/active/feature.md
- [ ] No behavior change for existing users

---

### Phase 2: Folder Structure and Init

**Goal**: Add `specs/` folder creation to init command and templates.

**Files to create/modify:**
- `src/commands/init.ts` - Add option for specs folder
- `templates/specs/` - NEW: Template structure
- `templates/specs/templates/spec-template.md` - NEW: Blank spec template

**Steps:**

1. Create template structure:
   ```
   templates/specs/
   ├── active/
   │   └── .gitkeep
   ├── completed/
   │   └── .gitkeep
   ├── templates/
   │   └── spec-template.md
   └── lessons.md
   ```

2. Update `runInit` to optionally create specs folder:
   - Default: Create specs/ folder for new projects
   - Add `--no-specs-folder` flag to skip
   - Migrate existing SPEC.md? No - keep backward compat

3. Create `spec-template.md`:
   ```markdown
   # [Feature Name]

   ## Goal
   [What this achieves when complete]

   ## Context
   [Background, motivation, dependencies]

   ## Tasks
   - [ ] Task 1
     - Deliverable 1
     - Deliverable 2

   ## Acceptance Criteria
   [Optional - EARS format recommended]
   - WHEN [trigger], THEN [response]

   ## Notes
   [Optional - decisions, constraints, out of scope]
   ```

4. Create initial `lessons.md`:
   ```markdown
   # Lessons Learned

   Track what works and what doesn't across specs.

   ## Format
   - **Date**: What we learned
   - Optionally tag: #testing, #architecture, #scope

   ## Lessons
   <!-- Add entries as you learn -->
   ```

**Tests:**
- `ralphie init` creates specs/ folder
- `ralphie init --no-specs-folder` skips creation
- Existing files not overwritten (current behavior preserved)

**Acceptance Criteria:**
- [ ] `ralphie init` creates new folder structure
- [ ] Templates match documented format
- [ ] Backward compatible with existing init behavior

---

### Phase 3: Enhanced SPEC Format Support

**Goal**: Add parsing support for new optional sections and parallel markers.

**Files to modify:**
- `src/lib/spec-parser.ts` - Add new section parsing
- `tests/spec-parser.test.ts` - Add tests for new format

**Steps:**

1. Add new interfaces:
   ```typescript
   interface AcceptanceCriterion {
     text: string;
     type: 'ears' | 'simple';
     earsPattern?: 'ubiquitous' | 'when' | 'while' | 'where' | 'if-then' | 'complex';
   }

   interface TaskInfo {
     // existing fields...
     isParallel: boolean;  // NEW: marked with [P]
     acceptanceCriteria?: AcceptanceCriterion[];  // NEW
   }

   interface SpecStructure {
     // existing fields...
     context?: string;  // NEW: ## Context section
     notes?: string;    // NEW: ## Notes section
     acceptanceCriteria?: AcceptanceCriterion[];  // NEW: spec-level
   }
   ```

2. Parse `[P]` parallel markers:
   - Pattern: `- [ ] [P] Task text` or `- [ ] Task text [P]`
   - Set `isParallel: true` on TaskInfo

3. Parse optional sections:
   - `## Context` - Store as string
   - `## Notes` - Store as string
   - `## Acceptance Criteria` - Parse as array

4. Parse EARS patterns in acceptance criteria:
   - Detect keywords: WHEN, WHILE, WHERE, IF/THEN
   - Tag with pattern type for later validation

**Tests:**
- Parses [P] marker on tasks
- Extracts ## Context section
- Extracts ## Notes section
- Parses ## Acceptance Criteria section
- Identifies EARS patterns in criteria
- Backward compatible with existing SPEC format

**Acceptance Criteria:**
- [ ] Parser handles new optional sections
- [ ] [P] markers correctly identified
- [ ] EARS patterns detected (not validated yet)
- [ ] Existing specs still parse correctly

---

### Phase 4: EARS Validation in review-spec

**Goal**: Add EARS syntax validation to the review-spec skill.

**Files to create/modify:**
- `src/lib/ears-validator.ts` - NEW: EARS pattern validation
- `src/lib/spec-validator.ts` - Integrate EARS validation
- `skills/review-spec/SKILL.md` - Document EARS checking
- `tests/ears-validator.test.ts` - NEW: EARS validation tests

**Steps:**

1. Create `ears-validator.ts`:
   ```typescript
   interface EarsValidationResult {
     valid: boolean;
     pattern: string;
     warnings: string[];
     suggestions: string[];
   }

   function validateEarsRequirement(text: string): EarsValidationResult
   function detectEarsPattern(text: string): string | null
   function suggestEarsImprovement(text: string): string | null
   ```

2. Implement EARS pattern detection:
   - Ubiquitous: No keywords, just "The [system] shall..."
   - Event-Driven: "WHEN [trigger], the [system] shall..."
   - State-Driven: "WHILE [state], the [system] shall..."
   - Optional: "WHERE [feature], the [system] shall..."
   - Unwanted: "IF [condition], THEN the [system] shall..."
   - Complex: Multiple keywords combined

3. Implement anti-pattern detection:
   - More than 3 preconditions (too complex)
   - Missing system response
   - Vague triggers ("when needed", "as appropriate")
   - Implementation details in response

4. Update spec-validator to call EARS validation when acceptance criteria present

5. Update review-spec SKILL.md with EARS checking section

**Tests:**
- Validates correct EARS patterns
- Detects common anti-patterns
- Provides actionable suggestions
- Skips validation when no acceptance criteria

**Acceptance Criteria:**
- [ ] EARS patterns validated when present
- [ ] Anti-patterns detected with suggestions
- [ ] review-spec skill documents EARS checking
- [ ] Validation is optional (doesn't fail for simple specs)

---

### Phase 5: Lessons Learned System

**Goal**: Add CLI commands for managing lessons.md.

**Files to create/modify:**
- `src/commands/lessons.ts` - NEW: Lessons CLI commands
- `src/cli.tsx` - Register new commands
- `skills/spec-autonomous/SKILL.md` - Reference lessons during generation
- `skills/spec-interactive/SKILL.md` - Reference lessons during generation

**Steps:**

1. Create `lessons.ts` command:
   ```typescript
   // ralphie lessons - show all lessons
   // ralphie lessons add "lesson text" --tags "scope,testing"
   // ralphie lessons search "query"
   ```

2. Implement commands:
   - `lessons` (no args): Display contents of specs/lessons.md
   - `lessons add "text"`: Append new entry with timestamp
   - `lessons search "query"`: Filter lessons by text/tags

3. Lesson entry format:
   ```markdown
   ### 2026-01-18: [Lesson title or first line]
   [Full lesson text]
   Tags: #scope #testing
   ```

4. Update spec generation skills to optionally surface lessons:
   - Read lessons.md before generating
   - Include relevant lessons in context
   - Add note: "Consider lessons from: ..."

**Tests:**
- `ralphie lessons` displays lessons file
- `ralphie lessons add` appends correctly formatted entry
- `ralphie lessons search` filters results
- Graceful handling when no lessons.md exists

**Acceptance Criteria:**
- [ ] `ralphie lessons` command works
- [ ] `ralphie lessons add` appends entries
- [ ] Skills reference lessons during generation

---

### Phase 6: Archive and List Commands

**Goal**: Add CLI commands for spec management (list, archive).

**Files to create/modify:**
- `src/commands/spec.ts` - NEW: Spec management commands
- `src/lib/spec-archiver.ts` - NEW: Archive completed specs
- `src/cli.tsx` - Register new commands

**Steps:**

1. Create `spec.ts` command:
   ```typescript
   // ralphie spec list - show active specs
   // ralphie spec list --completed - show archived specs
   // ralphie spec "description" --name feature-name - create named spec
   // ralphie archive [spec-name] - move completed to archive
   ```

2. Implement spec listing:
   - Read specs/active/*.md, show name + task count + completion %
   - Read specs/completed/*.md for --completed flag
   - Fall back to SPEC.md if no specs folder

3. Implement archiving:
   - Verify spec is complete (no unchecked tasks)
   - Add date prefix: `2026-01-18-feature-name.md`
   - Move from active/ to completed/
   - Update any references (STATE.txt note)

4. Implement named spec creation:
   - Copy from templates/spec-template.md
   - Create as specs/active/{name}.md
   - Pre-fill title from description

**Tests:**
- `ralphie spec list` shows active specs
- `ralphie spec list --completed` shows archived
- `ralphie archive` moves completed spec
- `ralphie archive` fails for incomplete spec
- Named spec creation works

**Acceptance Criteria:**
- [ ] `ralphie spec list` works
- [ ] `ralphie archive` moves completed specs
- [ ] Named spec creation with `--name`

---

### Phase 7: Skill Updates

**Goal**: Update all spec-related skills to work with new format.

**Files to modify:**
- `skills/spec-autonomous/SKILL.md` - New format, new location
- `skills/spec-interactive/SKILL.md` - New format, new location
- `skills/review-spec/SKILL.md` - EARS validation, new sections
- `skills/ralphie-iterate/SKILL.md` - Find spec in new location

**Steps:**

1. Update spec-autonomous:
   - Output to specs/active/ when folder exists
   - Include optional sections (Context, Notes, Acceptance Criteria)
   - Reference lessons.md during generation
   - Use spec-template.md as base

2. Update spec-interactive:
   - Same changes as autonomous
   - Add interview questions for acceptance criteria
   - Ask about EARS format preference

3. Update review-spec:
   - Add EARS validation section
   - Check new optional sections
   - Validate parallel markers make sense

4. Update ralphie-iterate:
   - Use spec-locator to find active spec
   - Handle specs/active/ folder
   - No behavior change for root SPEC.md

**Tests:**
- Skills generate specs in correct location
- Skills read from correct location
- EARS validation runs when applicable
- Backward compatible with SPEC.md

**Acceptance Criteria:**
- [ ] All skills work with new folder structure
- [ ] All skills work with existing SPEC.md
- [ ] EARS validation integrated into review
- [ ] Lessons referenced during generation

---

## Testing Strategy

### Unit Tests
- `spec-locator.test.ts` - Spec discovery logic
- `spec-parser.test.ts` - New section parsing
- `ears-validator.test.ts` - EARS pattern validation
- `spec-archiver.test.ts` - Archive functionality

### Integration Tests
- Full workflow: init -> spec create -> iterate -> archive
- Backward compat: existing SPEC.md projects work unchanged
- Migration: project with SPEC.md can add specs/ folder

### Manual Testing Checklist
- [ ] New project init creates specs/ folder
- [ ] Existing project without specs/ continues to work
- [ ] `ralphie run` finds specs in both locations
- [ ] `ralphie spec list` shows correct information
- [ ] `ralphie archive` moves completed specs
- [ ] `ralphie lessons` commands work
- [ ] Skills generate to correct location

---

## Risks and Considerations

### High Priority

1. **Backward Compatibility Breaking**
   - Risk: Existing users' workflows break
   - Mitigation: Always check for SPEC.md first in fallback mode
   - Verification: Test suite includes backward compat tests

2. **Spec Location Confusion**
   - Risk: Users don't know where specs are
   - Mitigation: Clear error messages showing where Ralphie looked
   - Mitigation: `ralphie spec list` always shows locations

### Medium Priority

3. **Folder Accumulation**
   - Risk: Years of specs clutter the repo
   - Mitigation: Archive folder with date prefixes
   - Future: Consider auto-cleanup after X months

4. **EARS Learning Curve**
   - Risk: Users don't understand EARS syntax
   - Mitigation: Make EARS optional, provide suggestions not errors
   - Mitigation: Include examples in templates

### Low Priority

5. **Parallel Marker Complexity**
   - Risk: [P] markers don't translate to actual parallelism
   - Mitigation: Document as "hint for manual execution"
   - Future: Could integrate with Task parallel spawning

---

## Estimated Complexity

| Phase | Effort | Risk | Dependencies |
|-------|--------|------|--------------|
| Phase 1: Spec Discovery | Medium | Low | None |
| Phase 2: Folder Structure | Low | Low | Phase 1 |
| Phase 3: Enhanced Format | Medium | Low | Phase 1 |
| Phase 4: EARS Validation | Medium | Medium | Phase 3 |
| Phase 5: Lessons System | Low | Low | Phase 2 |
| Phase 6: Archive/List | Medium | Low | Phase 1, 2 |
| Phase 7: Skill Updates | High | Medium | All previous |

**Total Estimate**: 5-7 iterations (one phase per iteration, Phase 7 may split)

**Recommended Order**:
1. Phase 1 (foundation)
2. Phase 2 (structure)
3. Phase 3 (format)
4. Phase 6 (CLI - enables testing)
5. Phase 5 (lessons)
6. Phase 4 (EARS)
7. Phase 7 (skills)

---

## Out of Scope

- Multi-spec parallel execution (future enhancement)
- Spec dependency graphs (too complex for MVP)
- Web UI for spec management (CLI-first)
- Automatic migration tool for existing SPEC.md (manual is fine)
- Integration with external spec tools (Kiro, Spec Kit)

---

## References

- [EARS Definitive Guide](https://qracorp.com/guides_checklists/the-easy-approach-to-requirements-syntax-ears/)
- [Kiro Specs Documentation](https://kiro.dev/docs/specs/)
- [GitHub Spec Kit](https://github.com/github/spec-kit)
- [EARS IEEE Paper](https://ieeexplore.ieee.org/document/5328509/)
