---
name: verify
description: Pre-commit verification skill that auto-detects project tooling (package.json scripts, tsconfig, pytest, eslint, etc.) and runs appropriate tests, type checks, and linting. Zero configuration required - Claude figures it out from codebase context.
context: fork
allowed-tools: Read, Glob, Bash, Grep
---

# Verify Skill

Auto-detect and run project verification checks before committing. Claude inspects the codebase to determine what tools are available and runs appropriate checks.

## Workflow

```
Detect Tools → Run Checks → Report Results
```

## Step 1: Detect Project Type and Tooling

Read configuration files to understand what verification tools are available.

### 1.1 Check for Node.js/TypeScript Project

```bash
# Check for package.json
Read package.json
```

**Look for:**
- `scripts`: Contains test commands (e.g., `"test": "vitest"`, `"type-check": "tsc --noEmit"`)
- `devDependencies`: TypeScript, eslint, vitest, jest, prettier, etc.
- `dependencies`: Project runtime dependencies

**Common patterns:**

| Script Name | Tool | What It Does |
|-------------|------|--------------|
| `test` | vitest/jest/mocha | Runs unit/integration tests |
| `test:unit` | vitest/jest | Runs only unit tests |
| `test:integration` | vitest/jest | Runs only integration tests |
| `test:e2e` | playwright/cypress | Runs E2E tests |
| `type-check` | tsc | TypeScript type checking |
| `lint` | eslint | Code linting |
| `format` | prettier | Code formatting check |
| `format:check` | prettier | Check formatting without fixing |

### 1.2 Check for TypeScript

```bash
# Check for tsconfig.json
Read tsconfig.json
```

If `tsconfig.json` exists, TypeScript type checking is required:
- Run `npm run type-check` if available in package.json
- Otherwise run `npx tsc --noEmit`

### 1.3 Check for Python Project

```bash
# Check for Python project markers
Glob pattern="*.py" path=.
Glob pattern="pyproject.toml"
Glob pattern="setup.py"
Glob pattern="requirements.txt"
```

**Look for:**

| File | Tool | What to Run |
|------|------|-------------|
| `pyproject.toml` | pytest/ruff/mypy | Check `[tool.pytest]`, `[tool.ruff]`, `[tool.mypy]` sections |
| `setup.py` | setuptools | Python package, run `python -m pytest` |
| `requirements.txt` | pip | Check for pytest, mypy, ruff, pylint in dependencies |
| `.py` files | pytest | Run `pytest` or `python -m pytest` |

**Common Python commands:**

```bash
# Tests
pytest
python -m pytest
pytest tests/

# Type checking
mypy src/
python -m mypy src/

# Linting
ruff check src/
pylint src/
```

### 1.4 Check for Other Languages

**Go:**
```bash
Glob pattern="go.mod"
# If found, run: go test ./... && go vet ./...
```

**Rust:**
```bash
Glob pattern="Cargo.toml"
# If found, run: cargo test && cargo clippy
```

**Ruby:**
```bash
Glob pattern="Gemfile"
# If found, run: bundle exec rspec (or rake test)
```

## Step 2: Run Verification Checks

Run checks in priority order: **tests → type checking → linting**.

### 2.1 Run Tests

**Node.js/TypeScript:**
```bash
# Priority order (stop at first match):
1. npm run test          # If "test" script exists
2. npm run test:unit     # If only unit tests needed
3. npx vitest run        # If vitest in devDependencies
4. npx jest              # If jest in devDependencies
```

**Python:**
```bash
# Priority order:
1. pytest                # If pytest is installed
2. python -m pytest      # Alternative invocation
3. python -m unittest    # Fallback for stdlib tests
```

**Detect test location:**
- Node.js: Usually `tests/` or `src/**/*.test.ts` or `src/**/*.spec.ts`
- Python: Usually `tests/` or `test_*.py` files

### 2.2 Run Type Checking

**TypeScript:**
```bash
# Priority order:
1. npm run type-check    # If script exists in package.json
2. npx tsc --noEmit      # Direct TypeScript check
```

**Python (optional, not all projects use):**
```bash
# Priority order:
1. mypy src/             # If mypy in dependencies
2. python -m mypy src/   # Alternative invocation
```

**Note:** Type checking is MANDATORY for TypeScript projects, OPTIONAL for Python (many don't use type hints).

### 2.3 Run Linting (Optional)

Linting is optional but recommended if tools are present.

**Node.js/TypeScript:**
```bash
# Priority order:
1. npm run lint          # If "lint" script exists
2. npx eslint src/       # If eslint in devDependencies
```

**Python:**
```bash
# Priority order:
1. ruff check src/       # If ruff installed (fast, modern)
2. pylint src/           # If pylint installed (slower, thorough)
```

**Skip linting if:**
- No lint command in package.json
- No linter in dependencies
- User explicitly said "skip linting"

## Step 3: Report Results

### 3.1 Success Report

If all checks pass:

```markdown
# Verification: PASS ✓

## Tests: PASS
- Command: `npm test`
- Duration: 2.4s
- Results: 127 passing

## Type Check: PASS
- Command: `npm run type-check`
- Duration: 1.8s
- No type errors found

## Lint: PASS
- Command: `npm run lint`
- Duration: 0.9s
- No lint errors

---

✓ All checks passed. Safe to commit.
```

### 3.2 Failure Report

If any check fails:

```markdown
# Verification: FAIL ✗

## Tests: FAIL
- Command: `npm test`
- Duration: 3.1s
- Results: 125 passing, 2 failing

### Failed Tests

1. **UserService.test.ts**
   ```
   FAIL tests/UserService.test.ts
   ● UserService › getUserById › returns user when found

     expect(received).toEqual(expected)

     Expected: {"id": "123", "name": "Alice"}
     Received: {"id": "123", "name": null}

       at tests/UserService.test.ts:42:25
   ```

2. **AuthController.test.ts**
   ```
   FAIL tests/AuthController.test.ts
   ● AuthController › login › returns 401 for invalid credentials

     Expected status 401, received 500

       at tests/AuthController.test.ts:58:30
   ```

## Type Check: PASS
- Command: `npm run type-check`
- Duration: 1.8s
- No type errors found

## Lint: SKIPPED
- Skipped because tests failed

---

✗ Fix failing tests before committing.
```

### 3.3 Error Report

If verification can't run (e.g., missing dependencies):

```markdown
# Verification: ERROR

## Issue

Cannot run tests - dependencies not installed.

## Details

- Tried: `npm test`
- Error: `sh: vitest: command not found`
- Cause: `node_modules/` is missing or incomplete

## Fix

Run `npm install` to install dependencies, then try verification again.

---

⚠️ Cannot verify without dependencies.
```

## Step 4: Exit Codes and Behavior

### Exit Behavior

**If verification PASSES:**
- Report success
- Tell user it's safe to commit
- Return to iteration workflow

**If verification FAILS:**
- Report failures with details
- DO NOT commit
- Tell user to fix issues and re-run `/verify`

**If verification ERRORS:**
- Report configuration issue
- Provide fix suggestion
- DO NOT commit

### When to Skip Checks

**Skip tests if:**
- No test files exist (check with `Glob pattern="**/*.test.*"`)
- Documentation-only changes (README.md, *.md files)
- Configuration-only changes (tsconfig.json, package.json metadata)

**Skip type checking if:**
- No TypeScript in project (no tsconfig.json)
- Python project without mypy

**Skip linting if:**
- No linter configured
- User explicitly requested to skip

## Quick Decision Tree

```
Start
  │
  ├─ package.json exists?
  │   ├─ Yes → Read package.json scripts
  │   │         └─ Run npm run test (or equivalent)
  │   │         └─ Run npm run type-check (if TS)
  │   │         └─ Run npm run lint (optional)
  │   │
  │   └─ No → Check for Python
  │            └─ *.py files exist?
  │                ├─ Yes → Run pytest
  │                │         └─ Run mypy (if configured)
  │                │         └─ Run ruff check (if installed)
  │                │
  │                └─ No → Check for Go, Rust, Ruby...
  │                         └─ Run language-specific tests
```

## Examples

### Example 1: TypeScript Project (All Pass)

**Detection:**
```bash
Read package.json
# Found scripts: { "test": "vitest run", "type-check": "tsc --noEmit", "lint": "eslint src/" }

Read tsconfig.json
# Found: compilerOptions with strict: true
```

**Execution:**
```bash
npm run test
# ✓ 127 tests passing (2.4s)

npm run type-check
# ✓ No type errors (1.8s)

npm run lint
# ✓ No lint errors (0.9s)
```

**Report:**
```
# Verification: PASS ✓

All checks passed. Safe to commit.
```

### Example 2: Python Project (Test Failure)

**Detection:**
```bash
Glob pattern="*.py"
# Found: src/app.py, tests/test_app.py

Read pyproject.toml
# Found: [tool.pytest], [tool.mypy]
```

**Execution:**
```bash
pytest
# ✗ 8 passing, 1 failing (1.2s)
# FAIL: tests/test_app.py::test_login - AssertionError: Expected 401, got 500

python -m mypy src/
# ✓ Success: no issues found (0.8s)
```

**Report:**
```
# Verification: FAIL ✗

## Tests: FAIL
- 8 passing, 1 failing
- FAIL: tests/test_app.py::test_login - AssertionError: Expected 401, got 500

Fix failing test before committing.
```

### Example 3: Documentation-Only Change (Skip Tests)

**Detection:**
```bash
# Changes detected: README.md, docs/api.md (from git status)
Read package.json
# Found test script
```

**Decision:**
```
Documentation-only changes detected. Tests can be skipped.
```

**Execution:**
```bash
# SKIP tests (no code changes)
npm run type-check
# ✓ No type errors (1.8s)
```

**Report:**
```
# Verification: PASS ✓

Tests skipped (documentation-only changes).
Type check passed. Safe to commit.
```

## Integration with Ralphie Iteration

Use `/verify` in Step 5 (Review) of the Ralphie iteration:

```markdown
## Step 5: Review

1. Run verification checks:
   ```
   /verify
   ```

2. If PASS:
   - Proceed to Step 6 (Commit)

3. If FAIL:
   - Fix issues
   - Re-run verification
   - Don't commit until PASS

4. If ERROR:
   - Fix configuration issue (e.g., npm install)
   - Re-run verification
```

## When to Use This Skill

**Use `/verify` when:**
- About to commit code changes in Ralphie iteration
- User asks "are tests passing?"
- Unsure if type checking passes
- Want to check lint status
- After fixing bugs, before committing

**Don't use when:**
- Already ran tests manually and they passed
- Doing exploratory coding (not ready to commit)
- Making documentation-only changes (unless user asks)

## Advanced: Custom Verification

If a project has custom verification needs, detect from package.json:

```json
{
  "scripts": {
    "verify": "npm run test && npm run type-check && npm run lint",
    "precommit": "npm run verify"
  }
}
```

**Priority:**
1. If `verify` script exists, run that
2. If `precommit` script exists, run that
3. Otherwise, detect and run individual checks

This allows projects to define their own verification flow while maintaining zero-config defaults.

---

**Remember:** This skill is for **pre-commit verification**, not for debugging or development. It's a final check before committing, not a development workflow tool.
