# Ralph - Let AI Code While You Sleep

Ralph runs AI in a loop to build software. You describe what you want, Ralph builds it piece by piece, committing working code along the way. Come back to find your project done.

## What Ralph Does

1. You describe what you want to build
2. Claude interviews you and creates a **SPEC** (a structured task list)
3. Ralph picks the next task from your SPEC
4. Ralph writes code, runs tests, and commits
5. Repeat until your project is done

**Example:** You tell Claude "I want a todo app with user login." Claude asks clarifying questions, then generates a detailed SPEC. Ralph implements authentication, creates the database, builds the UI, writes tests - all while you're away.

## Quick Start

### 1. Install Ralph

```bash
# Clone the repo
git clone https://github.com/skylarbarrera/ralph.git my-project
cd my-project

# Install dependencies
npm install

# Make ralph available as a command
npm link
```

### 2. Install Claude Code

Ralph uses Claude Code (Anthropic's AI coding tool) under the hood:

```bash
curl -fsSL https://anthropic.com/install-claude.sh | sh
claude  # Run once to log in
```

### 3. Install Ralph Skills (Optional but Recommended)

Ralph includes three helpful skills for Claude Code:

```bash
# Install all Ralph skills
npx add-skill skylarbarrera/ralph

# Or install selectively
npx add-skill skylarbarrera/ralph --skill create-spec
npx add-skill skylarbarrera/ralph --skill ralph-iterate
npx add-skill skylarbarrera/ralph --skill review-spec
npx add-skill skylarbarrera/ralph --skill verify
```

**Skills included:**
- `create-spec` - Guided SPEC creation with structured interview
- `ralph-iterate` - Complete iteration protocol for executing tasks
- `review-spec` - SPEC validation and quality review
- `verify` - Pre-commit verification (tests, type check, lint)

### 4. Create Your SPEC

Tell Claude what you want to build. Use the `/create-spec` skill for a guided experience:

```bash
claude
> /create-spec
```

Claude will interview you about your project (type, stack, features, constraints) and generate a well-structured `SPEC.md`. The skill includes LLM review to ensure the spec follows conventions.

```markdown
# My Project

## Tasks
- [ ] Set up the project with TypeScript
- [ ] Create a User model with name and email
- [ ] Build a REST API for users (create, read, update, delete)
- [ ] Add authentication with JWT tokens
- [ ] Write tests for all endpoints
```

**Starting something new?** Replace your old SPEC. Each SPEC represents one project or feature set.

**Alternative:** Use the command-line for autonomous spec generation:

```bash
# Interactive mode (default) - uses /create-spec skill with interview
ralph spec "Build a REST API for user management with JWT auth"

# Autonomous mode - generates spec with review loop, no human interaction
ralph spec --auto "Todo app with user accounts and sharing"

# Headless mode - outputs JSON events, great for automation
ralph spec --headless "Blog platform with markdown support"
```

### 5. Run Ralph

```bash
ralph run           # Run once to see how it works
ralph run -n 10     # Run 10 times to build more
ralph run --all     # Run until SPEC is complete
```

That's it! Check your git history to see what Ralph built.

## Commands

| Command | What it does |
|---------|-------------|
| `ralph run` | Run one iteration |
| `ralph run -n 5` | Run 5 iterations |
| `ralph run --all` | Run until SPEC complete |
| `ralph run --headless` | Output JSON events (no UI) |
| `ralph spec "description"` | Generate SPEC.md with interview (interactive, default) |
| `ralph spec --auto "description"` | Generate SPEC.md autonomously with review loop |
| `ralph spec --headless "description"` | Generate SPEC.md and output JSON events |
| `ralph init` | Add Ralph to an existing project |
| `ralph validate` | Check project structure and SPEC conventions |
| `ralph upgrade` | Upgrade project to latest version |

### Run Options

| Option | Description |
|--------|-------------|
| `-n, --iterations <n>` | Number of iterations (default: 1) |
| `-a, --all` | Run until SPEC complete (max 100) |
| `-p, --prompt <text>` | Custom prompt to send to Claude |
| `--prompt-file <path>` | Read prompt from file |
| `--cwd <path>` | Working directory (default: current) |
| `--timeout-idle <sec>` | Kill after N seconds idle (default: 120) |
| `--save-jsonl <path>` | Save raw output to JSONL file |
| `--no-branch` | Skip feature branch creation |
| `--headless` | Output JSON events instead of UI |
| `--stuck-threshold <n>` | Iterations without progress before stuck (default: 3) |
| `--harness <name>` | AI harness to use (default: claude-code) |

## Creating a Good SPEC

Claude will interview you to create a detailed SPEC. The more context you provide, the better the result.

**What to tell Claude:**
- What you're building and why
- Technologies you want to use (or let Claude recommend)
- Any constraints or preferences

**Claude will ask about:**
- Edge cases and error handling
- Database and storage choices
- Authentication requirements
- Testing strategy

**Example conversation:**
```
You: I want a blog with markdown support
Claude: What kind of users will interact with it? Just admins, or public readers too?
You: Admins write posts, anyone can read
Claude: Should readers be able to comment?
You: Yes, but comments need approval
Claude: [generates detailed SPEC with tasks for admin auth, post CRUD,
        markdown rendering, comment moderation, etc.]
```

**Tips for good SPECs:**
- Be specific about what you want
- Answer Claude's questions thoroughly
- Each task should be one focused piece of work
- Tests are included as part of implementation

**Starting a new project?** Replace your old SPEC entirely. Each SPEC is one project or feature set.

## How It Works

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│   You describe idea    ──►   Claude interviews you           │
│                              Claude creates SPEC.md          │
│                                                              │
│   You run ralph        ──►   Ralph reads SPEC                │
│                              Ralph picks next task           │
│                              Ralph writes code               │
│                              Ralph runs tests                │
│                              Ralph commits                   │
│                              (repeat)                        │
│                                                              │
│   You come back        ◄──   Working code in git history    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

Each iteration, Ralph:
1. Reads your SPEC to find the next unchecked task
2. Plans how to implement it
3. Writes the code
4. Runs tests to make sure it works
5. Commits the changes
6. Marks the task as done

## Using the Verify Skill

The `/verify` skill helps ensure code quality before committing. Claude can use it during iterations to check work:

```bash
claude
> /verify
```

The skill auto-detects your project type and runs appropriate checks:
- **Tests**: npm test, pytest, go test, cargo test, etc.
- **Type checking**: tsc, mypy, etc.
- **Linting**: eslint, ruff, golangci-lint, clippy, etc.

**Zero configuration required** - the skill detects what to run from your project files (package.json, tsconfig.json, pyproject.toml, etc.)

**In Ralph iterations:** Claude automatically uses `/verify` before committing when using the `/ralph-iterate` skill.

## Harness Configuration

Ralph supports multiple AI coding assistants through a harness abstraction. Currently, only Claude Code is implemented (v1.0).

**Configuration priority:**
1. CLI flag: `ralph run --harness codex`
2. Environment variable: `RALPH_HARNESS=codex`
3. Config file: `.ralph/config.yml`
4. Default: `claude-code`

**Config file example (.ralph/config.yml):**
```yaml
harness: claude-code
```

Future harnesses (Codex, OpenCode, etc.) can be added by implementing the harness interface.

## Headless Mode

For automation and integration with orchestration tools, Ralph supports headless mode:

```bash
ralph run --headless -n 10
```

Instead of the interactive UI, Ralph outputs JSON events to stdout (one per line):

```json
{"event":"started","spec":"SPEC.md","tasks":5,"timestamp":"2024-01-15T10:30:00Z"}
{"event":"iteration","n":1,"phase":"starting"}
{"event":"tool","type":"read","path":"src/index.ts"}
{"event":"tool","type":"write","path":"src/utils.ts"}
{"event":"tool","type":"bash"}
{"event":"commit","hash":"abc1234","message":"Add utility functions"}
{"event":"task_complete","index":0,"text":"Set up project structure"}
{"event":"iteration_done","n":1,"duration_ms":45000,"stats":{"reads":3,"writes":2,"commands":1}}
{"event":"complete","tasks_done":5,"total_duration_ms":180000}
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | All tasks complete |
| 1 | Stuck (no progress after threshold) |
| 2 | Max iterations reached |
| 3 | Fatal error |

### Stuck Detection

Use `--stuck-threshold` to control when Ralph gives up:

```bash
ralph run --headless --stuck-threshold 5  # Give up after 5 iterations without progress
```

### Autonomous Spec Generation

For fully automated pipelines, generate specs without human input:

```bash
# Interactive - shows progress
ralph spec "REST API for user management with JWT auth"

# Headless - outputs JSON events
ralph spec --headless "Todo app with user accounts and sharing"
```

Headless output:
```json
{"event":"spec_generation_started","description":"...","timestamp":"..."}
{"event":"spec_generation_complete","specPath":"SPEC.md","taskCount":8,"validationPassed":true,"violations":0}
```

This enables end-to-end automation:
```bash
ralph spec --headless "my project" && ralph run --headless --all
```

## Project Structure

After running `ralph init`, your project looks like this:

```
your-project/
├── SPEC.md              # Your requirements (created via /create-spec)
├── STATE.txt            # Progress log (Ralph updates this)
├── .ai/ralph/
│   ├── plan.md          # Current task plan
│   └── index.md         # History of what Ralph did
└── .claude/
    ├── ralph.md         # Coding standards for Ralph
    └── skills/
        ├── create-spec/ # Guided spec creation with LLM review
        └── ralph-iterate/ # Iteration execution protocol
```

## Adding Ralph to an Existing Project

Already have a project? Just run:

```bash
cd your-project
ralph init
```

Then create your SPEC.md and run `ralph run`.

## Example Workflows

Ralph includes ready-to-use scripts for common tasks:

### Improve Test Coverage
```bash
./examples/test-coverage-loop.sh 20 80   # 20 iterations, target 80% coverage
```

### Fix Linting Errors
```bash
./examples/linting-loop.sh 30            # Fix up to 30 lint errors
```

### Clean Up Code Duplication
```bash
./examples/refactor-loop.sh 15           # 15 refactoring iterations
```

### Create PRs for Each Task
```bash
./examples/pr-review-loop.sh 10          # Creates GitHub PRs for review
```

## Safety Tips

- **Start small:** Run `ralph run` once first to see what happens
- **Check commits:** Review what Ralph builds in your git history
- **Use limits:** Set iteration limits to control how much Ralph does
- **Sandbox option:** Run in Docker for complete isolation:
  ```bash
  docker sandbox run claude ralph run -n 10
  ```

## Troubleshooting

**"command not found: ralph"**
```bash
npm link   # Makes ralph available globally
```

**"command not found: claude"**
```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

**Ralph keeps working on the same task**
- Make sure tasks in SPEC.md use checkboxes: `- [ ]` (not done) vs `- [x]` (done)
- Check STATE.txt to see what's been completed

**Tests keep failing**
- Add to your SPEC: "Fix any test failures before proceeding"
- Or let Ralph fix them: `ralph run -p "Fix all failing tests"`

## Cost

Ralph runs Claude repeatedly, which costs money:
- Roughly $0.10-0.50 per iteration depending on task complexity
- Set iteration limits to control spending
- Monitor usage in your Anthropic dashboard

## Requirements

- Node.js 18+
- Claude Code CLI (free to install, requires Anthropic account)
- Git (for commits)


## License

MIT
