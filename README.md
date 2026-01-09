# Ralph - Let AI Code While You Sleep

Ralph runs AI in a loop to build software. You describe what you want, Ralph builds it piece by piece, committing working code along the way. Come back to find your project done.

## What Ralph Does

1. You write a **SPEC** (a list of features you want)
2. Ralph picks the next task from your list
3. Ralph writes code, runs tests, and commits
4. Repeat until your project is done

**Example:** You write "Build a todo app with user login" as a SPEC. Ralph implements authentication, creates the database, builds the UI, writes tests - all while you're away.

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

### 3. Write Your SPEC

Create a file called `SPEC.md` with what you want built:

```markdown
# My Project

## Tasks
- [ ] Set up the project with TypeScript
- [ ] Create a User model with name and email
- [ ] Build a REST API for users (create, read, update, delete)
- [ ] Add authentication with JWT tokens
- [ ] Write tests for all endpoints
```

### 4. Run Ralph

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
| `ralph init` | Add Ralph to an existing project |
| `ralph validate` | Check if project is ready |

## Writing a Good SPEC

Your SPEC determines what Ralph builds. Better SPECs = better results.

**Good SPEC:**
```markdown
- [ ] Create User model with fields: id, name, email, passwordHash
- [ ] Build POST /register endpoint with email validation
- [ ] Build POST /login endpoint that returns JWT token
- [ ] Add authentication middleware that verifies JWT
- [ ] Write tests for registration and login flows
```

**Bad SPEC:**
```markdown
- [ ] Make authentication work
- [ ] Add some tests
```

**Tips:**
- Be specific about what you want
- Break big features into smaller tasks
- Include testing as part of tasks ("with tests")
- One task = one focused piece of work

## How It Works

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│   You write SPEC.md    ──►   Ralph reads it                  │
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

## Project Structure

After running `ralph init`, your project looks like this:

```
your-project/
├── SPEC.md              # Your requirements (you write this)
├── STATE.txt            # Progress log (Ralph updates this)
├── .ai/ralph/
│   ├── plan.md          # Current task plan
│   └── index.md         # History of what Ralph did
└── .claude/
    └── ralph.md         # Coding standards for Ralph
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

## Credits

Ralph was created by [Andrew Ettinger](https://twitter.com/aettinger). This implementation is based on his guide: [How to Build with Ralph](https://www.ettinger.dev/how-to-build-with-ralph).

## License

MIT
