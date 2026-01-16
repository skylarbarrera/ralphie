# Claude Code Hooks for Ralphie

Hooks allow you to run custom scripts at specific points in Claude's execution. They're perfect for Ralphie loops to ensure quality standards are maintained.

## Available Hooks

### pre-commit-lint.sh
Runs linting before each commit. Prevents commits with linting errors.

**What it does:**
- Detects project type (Node.js, Python, Go, Rust)
- Runs appropriate linter (eslint, pylint, mypy, etc.)
- Blocks commit if linting fails

**Install:**
```bash
# Option 1: Configure in Claude Code settings
# Add to ~/.config/claude/settings.json:
{
  "hooks": {
    "pre-commit": ".claude/hooks/pre-commit-lint.sh"
  }
}

# Option 2: Git pre-commit hook
cp .claude/hooks/pre-commit-lint.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

### pre-commit-test.sh
Runs tests before each commit. Ensures all tests pass before committing.

**What it does:**
- Detects project type
- Runs test suite (npm test, pytest, go test, cargo test)
- Blocks commit if tests fail

**Install:**
```bash
# Same as above, but use pre-commit-test.sh
# You can chain both hooks by combining them in a single script
```

## Creating Custom Hooks

Create your own hooks for project-specific needs:

### Example: Coverage Check
```bash
#!/bin/bash
# .claude/hooks/coverage-check.sh

set -e

echo "Checking test coverage..."
npm run coverage

# Parse coverage output and fail if below threshold
COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
THRESHOLD=80

if (( $(echo "$COVERAGE < $THRESHOLD" | bc -l) )); then
  echo "❌ Coverage $COVERAGE% is below threshold $THRESHOLD%"
  exit 1
fi

echo "✓ Coverage $COVERAGE% meets threshold"
```

### Example: Bundle Size Check
```bash
#!/bin/bash
# .claude/hooks/bundle-size-check.sh

set -e

echo "Checking bundle size..."
npm run build

SIZE=$(du -k dist/bundle.js | cut -f1)
MAX_SIZE=500  # 500KB

if [ "$SIZE" -gt "$MAX_SIZE" ]; then
  echo "❌ Bundle size ${SIZE}KB exceeds maximum ${MAX_SIZE}KB"
  exit 1
fi

echo "✓ Bundle size ${SIZE}KB is within limit"
```

### Example: Security Audit
```bash
#!/bin/bash
# .claude/hooks/security-audit.sh

set -e

echo "Running security audit..."

if [ -f "package-lock.json" ]; then
  npm audit --audit-level=high
elif [ -f "Pipfile.lock" ]; then
  safety check
fi

echo "✓ No high-severity vulnerabilities found"
```

## Hook Types

Claude Code supports these hook types:

- **pre-commit**: Runs before creating a commit
- **post-commit**: Runs after a commit is created
- **pre-tool**: Runs before executing specific tools
- **post-tool**: Runs after executing specific tools

## Best Practices

1. **Keep hooks fast** - Slow hooks delay the loop
2. **Make them idempotent** - Safe to run multiple times
3. **Provide clear error messages** - Help debug failures
4. **Exit with proper codes** - 0 for success, non-zero for failure
5. **Log what you're doing** - Use echo for visibility

## Using Hooks in Ralphie Loops

Hooks automatically run during Ralphie execution:

```bash
# Hooks run on every commit made by Ralphie
npm run ralphie -- -n 20

# If a hook fails, Ralphie stops and reports the error
# Fix the issue, then resume the loop
```

## Disabling Hooks Temporarily

```bash
# Skip hooks for a single run
SKIP_HOOKS=1 npm run ralphie -- -n 10

# Or use --no-verify in git commits
git commit --no-verify -m "message"
```

## Examples for Common Use Cases

### TypeScript Project
Combine linting, type checking, and tests:
```bash
#!/bin/bash
set -e
npm run lint
npm run type-check
npm test
```

### Python Project
Combine pylint, mypy, and pytest with coverage:
```bash
#!/bin/bash
set -e
pylint src/
mypy src/
pytest --cov=src --cov-fail-under=80
```

### Monorepo
Run checks only for changed packages:
```bash
#!/bin/bash
set -e

# Get changed files
CHANGED=$(git diff --cached --name-only)

# Check if package1 changed
if echo "$CHANGED" | grep -q "packages/package1"; then
  cd packages/package1 && npm test
fi

# Check if package2 changed
if echo "$CHANGED" | grep -q "packages/package2"; then
  cd packages/package2 && npm test
fi
```

## Troubleshooting

**Hook not running:**
- Check file permissions: `chmod +x .claude/hooks/your-hook.sh`
- Verify Claude Code settings path is correct
- Check hook script has no syntax errors: `bash -n your-hook.sh`

**Hook always failing:**
- Run the hook manually to see full error output
- Check for missing dependencies (linters, test runners)
- Ensure working directory is correct in the script

**Hook too slow:**
- Consider running fewer checks (e.g., only lint changed files)
- Use `--cache` flags for linters when available
- Run expensive checks (e.g., E2E tests) in CI instead
