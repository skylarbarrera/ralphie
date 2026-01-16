<p align="center">
  <img src="ralphie-white.png" alt="Ralphie" width="200">
</p>

# Ralphie - Let AI Code While You Sleep

Ralphie runs AI in a loop to build software. You describe what you want, Ralphie builds it piece by piece, committing working code along the way. Come back to find your project done.

## The Ralphie Wiggum Philosophy

Ralphie builds on the [Ralphie Wiggum technique](https://github.com/ghuntley/how-to-ralphie-wiggum) - an AI development methodology where a coding agent runs in a loop until all tasks are complete.

**Core insight:** Progress doesn't live in the LLM's context window - it lives in your files and git history.

Each iteration:
1. Starts with fresh context (no accumulated confusion)
2. Reads current state from disk (SPEC.md, git history)
3. Picks the next incomplete task
4. Writes code, commits, updates state
5. Exits - loop restarts with clean slate

**Why it works:** The AI can make mistakes, get confused, even fail completely - but the next iteration starts fresh and sees only the committed progress. Iteration beats perfection.

### Beyond Basic Ralphie Wiggum

The original technique works best for mechanical tasks with obvious completion criteria. Ralphie extends this to handle **larger features and architectural work** through:

- **Structured SPECs** - Break complex features into discrete, checkable tasks
- **Interview-based spec creation** - Handle ambiguity upfront, before the loop starts
- **Sub-bullets for scope** - Each checkbox can contain multiple implementation steps
- **Verification steps** - Catch issues during iteration, not after
- **Memory files** (.ai/ralphie/) - Maintain context across iterations without polluting the LLM

The key: transform ambiguous requirements into clear checklists *before* running the loop. The interview process does the thinking; the loop does the execution.

**Example:** "Build a user authentication system" is too vague for basic Ralphie Wiggum. But after an interview, it becomes:
```markdown
- [ ] Create User model with password hashing
- [ ] Add /auth/register endpoint with validation
- [ ] Add /auth/login endpoint returning JWT
- [ ] Create auth middleware for protected routes
- [ ] Write tests for all auth flows
```

Now each task has clear completion criteria, and the loop can execute.

## What Ralphie Does

1. You describe what you want to build
2. Claude interviews you and creates a **SPEC** (a structured task list)
3. Ralphie picks the next task from your SPEC
4. Ralphie writes code, runs tests, and commits
5. Repeat until your project is done

**Example:** You tell Claude "I want a todo app with user login." Claude asks clarifying questions, then generates a detailed SPEC. Ralphie implements authentication, creates the database, builds the UI, writes tests - all while you're away.

## Quick Start

### 1. Install Ralphie

```bash
# Clone the repo
git clone https://github.com/skylarbarrera/ralphie.git my-project
cd my-project

# Install dependencies
bun install

# Make ralphie available as a command
bun link
```

### 2. Install Claude Code

Ralphie uses Claude Code (Anthropic's AI coding tool) under the hood:

```bash
curl -fsSL https://anthropic.com/install-claude.sh | sh
claude  # Run once to log in
```

### 3. Install Ralphie Skills (Optional but Recommended)

Ralphie includes three helpful skills for Claude Code:

```bash
# Install all Ralphie skills
npx add-skill skylarbarrera/ralphie

# Or install selectively
npx add-skill skylarbarrera/ralphie --skill create-spec
npx add-skill skylarbarrera/ralphie --skill ralphie-iterate
npx add-skill skylarbarrera/ralphie --skill review-spec
npx add-skill skylarbarrera/ralphie --skill verify
```

**Skills included:**
- `create-spec` - Guided SPEC creation with structured interview
- `ralphie-iterate` - Complete iteration protocol for executing tasks
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
ralphie spec "Build a REST API for user management with JWT auth"

# Autonomous mode - generates spec with review loop, no human interaction
ralphie spec --auto "Todo app with user accounts and sharing"

# Headless mode - outputs JSON events, great for automation
ralphie spec --headless "Blog platform with markdown support"
```

### 5. Run Ralphie

```bash
ralphie run           # Run once to see how it works
ralphie run -n 10     # Run 10 times to build more
ralphie run --all     # Run until SPEC is complete
```

That's it! Check your git history to see what Ralphie built.

## Commands

| Command | What it does |
|---------|-------------|
| `ralphie run` | Run one iteration |
| `ralphie run -n 5` | Run 5 iterations |
| `ralphie run --all` | Run until SPEC complete |
| `ralphie run --headless` | Output JSON events (no UI) |
| `ralphie spec "description"` | Generate SPEC.md with interview (interactive, default) |
| `ralphie spec --auto "description"` | Generate SPEC.md autonomously with review loop |
| `ralphie spec --headless "description"` | Generate SPEC.md and output JSON events |
| `ralphie init` | Add Ralphie to an existing project |
| `ralphie validate` | Check project structure and SPEC conventions |
| `ralphie upgrade` | Upgrade project to latest version |

### Run Options

| Option | Description |
|--------|-------------|
| `-n, --iterations <n>` | Number of iterations (default: 1) |
| `-a, --all` | Run until SPEC complete (max 100) |
| `-g, --greedy` | Complete multiple tasks per iteration (see below) |
| `-p, --prompt <text>` | Custom prompt to send to Claude |
| `--prompt-file <path>` | Read prompt from file |
| `--cwd <path>` | Working directory (default: current) |
| `--timeout-idle <sec>` | Kill after N seconds idle (default: 120) |
| `--save-jsonl <path>` | Save raw output to JSONL file |
| `--no-branch` | Skip feature branch creation |
| `--headless` | Output JSON events instead of UI |
| `--stuck-threshold <n>` | Iterations without progress before stuck (default: 3) |
| `--harness <name>` | AI harness to use: `claude`, `codex` (default: claude) |

### Greedy Mode

By default, Ralphie follows the classic Ralphie Wiggum approach: **one task per iteration**, fresh context each time.

With `--greedy`, Ralphie intentionally breaks this rule - completing **as many tasks as possible** before the context fills up. This trades the "fresh start" guarantee for speed and shared context between related tasks:

```bash
ralphie run --greedy -n 5      # Each iteration does multiple tasks
ralphie run --greedy --all     # Maximum throughput
```

**Tradeoffs:**

| Aspect | Default (one task) | Greedy (many tasks) |
|--------|-------------------|---------------------|
| Throughput | Slower (iteration overhead per task) | Faster (overhead only at start) |
| Progress visibility | Frequent "iteration done" signals | Batched - wait longer, see more at once |
| Stuck detection | Precise (clean iteration boundaries) | Less precise (may timeout mid-task) |
| Context | Fresh start each task | Accumulates - helps related tasks, hurts unrelated |
| Error recovery | Clean restart on failure | Errors may cascade within iteration |

**When to use greedy:**
- Related tasks that benefit from shared context (model + API + tests)
- Initial project scaffolding
- Bulk refactoring or formatting
- When you want maximum speed

**When to use default:**
- Unrelated tasks that need isolation
- Complex features needing focused attention
- Debugging or investigation
- When you want precise progress tracking

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
│   You run ralphie        ──►   Ralphie reads SPEC                │
│                              Ralphie picks next task           │
│                              Ralphie writes code               │
│                              Ralphie runs tests                │
│                              Ralphie commits                   │
│                              (repeat)                        │
│                                                              │
│   You come back        ◄──   Working code in git history    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

Each iteration, Ralphie:
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

**In Ralphie iterations:** Claude automatically uses `/verify` before committing when using the `/ralphie-iterate` skill.

## Multi-AI Support

Ralphie supports multiple AI coding assistants through a harness abstraction layer. Switch between AI providers without changing your workflow.

### Available Harnesses

| Harness | Description | Status |
|---------|-------------|--------|
| `claude` | Claude Code via official SDK | ✅ Default |
| `codex` | OpenAI Codex CLI | ✅ Supported |

### API Keys

Each harness uses its provider's official SDK, which reads API keys from standard environment variables:

| Harness | Environment Variable |
|---------|---------------------|
| `claude` | `ANTHROPIC_API_KEY` |
| `codex` | `OPENAI_API_KEY` |

```bash
# Set your API keys
export ANTHROPIC_API_KEY=sk-ant-...   # For Claude
export OPENAI_API_KEY=sk-...          # For Codex

# Or add to your shell profile (~/.bashrc, ~/.zshrc)
```

Ralphie never stores or handles API keys directly - authentication is delegated entirely to the underlying SDKs.

### Usage

```bash
# Use Claude (default)
ralphie run

# Use Codex
ralphie run --harness codex

# Headless mode with Codex
ralphie run --headless --harness codex
```

### Configuration Priority

1. **CLI flag**: `ralphie run --harness codex`
2. **Environment variable**: `RALPH_HARNESS=codex`
3. **Config file**: `.ralphie/config.yml`
4. **Default**: `claude`

**Config file example (.ralphie/config.yml):**
```yaml
harness: codex
```

### Architecture

The harness abstraction provides:
- **Normalized events** - Tool calls, thinking, messages work identically across providers
- **SDK integration** - Uses official SDKs (Claude Agent SDK, Codex SDK) instead of CLI parsing
- **Easy extensibility** - Add new AI providers by implementing the `Harness` interface

```
┌─────────────────┐     ┌─────────────────┐
│   Ralphie TUI     │     │ Ralphie Headless  │
└────────┬────────┘     └────────┬────────┘
         │                       │
         └───────────┬───────────┘
                     │
              ┌──────▼──────┐
              │   Harness   │
              │  Abstraction│
              └──────┬──────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
   ┌────▼────┐  ┌────▼────┐  ┌────▼────┐
   │ Claude  │  │  Codex  │  │ Future  │
   │ Harness │  │ Harness │  │ Harness │
   └─────────┘  └─────────┘  └─────────┘
```

### Adding New Harnesses

Implement the `Harness` interface in `src/lib/harness/`:

```typescript
interface Harness {
  name: string;
  run(
    prompt: string,
    options: HarnessRunOptions,
    onEvent: (event: HarnessEvent) => void
  ): Promise<HarnessResult>;
}
```

Events emitted: `tool_start`, `tool_end`, `thinking`, `message`, `error`

## Headless Mode

For automation and integration with orchestration tools, Ralphie supports headless mode:

```bash
ralphie run --headless -n 10
```

Instead of the interactive UI, Ralphie outputs JSON events to stdout (one per line):

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

Use `--stuck-threshold` to control when Ralphie gives up:

```bash
ralphie run --headless --stuck-threshold 5  # Give up after 5 iterations without progress
```

### Autonomous Spec Generation

For fully automated pipelines, generate specs without human input:

```bash
# Interactive - shows progress
ralphie spec "REST API for user management with JWT auth"

# Headless - outputs JSON events
ralphie spec --headless "Todo app with user accounts and sharing"
```

Headless output:
```json
{"event":"spec_generation_started","description":"...","timestamp":"..."}
{"event":"spec_generation_complete","specPath":"SPEC.md","taskCount":8,"validationPassed":true,"violations":0}
```

This enables end-to-end automation:
```bash
ralphie spec --headless "my project" && ralphie run --headless --all
```

## Project Structure

After running `ralphie init`, your project looks like this:

```
your-project/
├── SPEC.md              # Your requirements (created via /create-spec)
├── STATE.txt            # Progress log (Ralphie updates this)
├── .ai/ralphie/
│   ├── plan.md          # Current task plan
│   └── index.md         # History of what Ralphie did
└── .claude/
    ├── ralphie.md         # Coding standards for Ralphie
    └── skills/
        ├── create-spec/ # Guided spec creation with LLM review
        └── ralphie-iterate/ # Iteration execution protocol
```

## Adding Ralphie to an Existing Project

Already have a project? Just run:

```bash
cd your-project
ralphie init
```

Then create your SPEC.md and run `ralphie run`.

## Example Workflows

Ralphie includes ready-to-use scripts for common tasks:

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

- **Start small:** Run `ralphie run` once first to see what happens
- **Check commits:** Review what Ralphie builds in your git history
- **Use limits:** Set iteration limits to control how much Ralphie does
- **Sandbox option:** Run in Docker for complete isolation:
  ```bash
  docker sandbox run claude ralphie run -n 10
  ```

## Troubleshooting

**"command not found: ralphie"**
```bash
bun link   # Makes ralphie available globally
```

**"command not found: claude"**
```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

**Ralphie keeps working on the same task**
- Make sure tasks in SPEC.md use checkboxes: `- [ ]` (not done) vs `- [x]` (done)
- Check STATE.txt to see what's been completed

**Tests keep failing**
- Add to your SPEC: "Fix any test failures before proceeding"
- Or let Ralphie fix them: `ralphie run -p "Fix all failing tests"`

## Cost

Ralphie runs Claude repeatedly, which costs money:
- Roughly $0.10-0.50 per iteration depending on task complexity
- Set iteration limits to control spending
- Monitor usage in your Anthropic dashboard

## Requirements

- [Bun](https://bun.sh) (fast JavaScript runtime)
- Claude Code CLI (free to install, requires Anthropic account)
- Git (for commits)


## License

MIT
