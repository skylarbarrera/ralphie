import { spawn, type ChildProcess } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { validateSpecInDir, formatValidationResult } from './spec-validator.js';

export interface SpecGeneratorOptions {
  description: string;
  cwd: string;
  headless: boolean;
  timeoutMs: number;
  model?: string;
}

export interface SpecGeneratorResult {
  success: boolean;
  specPath?: string;
  taskCount?: number;
  validationPassed?: boolean;
  validationOutput?: string;
  error?: string;
}

const SPEC_GENERATION_PROMPT = `You are generating a SPEC.md for a Ralph project. Your task is to create a well-structured specification based on the user's description.

## Your Task

Create a SPEC.md file based on this project description:

{DESCRIPTION}

## Process

1. **Analyze the description** - Understand what's being requested
2. **Explore the codebase FIRST** - Before designing tasks, understand what exists:
   - Read README.md, CLAUDE.md, and any docs/*.md for project context
   - Run \`ls\` and \`tree\` to see project structure
   - Use Glob to find relevant files (e.g., \`**/*.ts\`, \`**/routes/*\`)
   - Read key files to understand existing patterns, conventions, and architecture
   - Identify what can be reused vs. what needs to be created
   - Note how similar features are implemented
3. **Design tasks that integrate** - Tasks should fit with existing code:
   - Follow existing naming conventions
   - Use existing shared utilities/types
   - Match existing patterns (e.g., if all routes are in /routes, new ones go there too)
4. **Write SPEC.md** - Create the spec file following the rules below
5. **Validate** - Ensure the spec follows conventions

## SPEC Format

\`\`\`markdown
# Project Name

Brief description (1-2 sentences).

## Goal
What this project achieves when complete.

## Tasks

### Phase 1: Foundation
- [ ] Task description
  - Deliverable 1
  - Deliverable 2

### Phase 2: Core Features
- [ ] Another task
  - Deliverable 1
\`\`\`

## Critical Rules - What NOT to Include

SPECs describe **requirements**, not solutions. NEVER include:

- ❌ Code snippets or implementation examples
- ❌ File:line references (e.g., \`auth.ts:42\`)
- ❌ Shell commands (\`npm install X\`, \`git log\`)
- ❌ Root cause analysis ("The bug is because...")
- ❌ "Technical Notes" or "Fix Approach" sections
- ❌ Implementation instructions ("Use X to...", "Change line Y")

## Sub-bullets are Deliverables, NOT Instructions

\`\`\`markdown
# BAD - prescribes HOW
- [ ] Fix auth bug
  - Use \`bcrypt.compare()\` instead of \`===\`
  - Add try/catch at line 50

# GOOD - describes WHAT
- [ ] Fix auth bug
  - Password comparison should be timing-safe
  - Handle comparison errors gracefully
\`\`\`

## Task Batching

Each checkbox = one Ralph iteration. Batch related work:

\`\`\`markdown
# BAD - 4 iterations
- [ ] Create UserModel.ts
- [ ] Create UserService.ts
- [ ] Create UserController.ts
- [ ] Create user.test.ts

# GOOD - 1 iteration
- [ ] Create User module (Model, Service, Controller) with tests
\`\`\`

## Verification Steps

Each task SHOULD include a **Verify:** section with concrete checks:

\`\`\`markdown
- [ ] Implement authentication system
  - POST /auth/register - create user with hashed password
  - POST /auth/login - validate credentials, return JWT
  - Tests for all auth flows

  **Verify:**
  - \`curl -X POST localhost:3000/auth/register -d '{"email":"test@test.com","password":"test123"}'\` → 201
  - \`curl -X POST localhost:3000/auth/login -d '{"email":"test@test.com","password":"test123"}'\` → returns JWT
  - \`npm test\` → all tests pass
\`\`\`

Good verification steps:
- API calls with expected response codes
- CLI commands with expected output
- File existence checks (\`ls dist/\` → contains index.js)
- Test commands (\`npm test\` → all pass)

## Output

After writing SPEC.md, output a summary:
- Number of phases
- Number of tasks
- Estimated complexity`;

const INTERACTIVE_ADDENDUM = `

If the description is vague or missing critical details, ask clarifying questions before generating. Good questions:
- What's the primary use case?
- Who are the target users?
- Any specific tech stack preferences?
- What integrations are needed?

Once you have enough context, write the SPEC.md.`;

const HEADLESS_ADDENDUM = `

Do NOT ask questions. Make reasonable assumptions based on the description. If something is ambiguous, choose the simpler option.

Write the SPEC.md now.`;

function emitJson(event: Record<string, unknown>): void {
  console.log(JSON.stringify({ ...event, timestamp: new Date().toISOString() }));
}

export async function generateSpec(options: SpecGeneratorOptions): Promise<SpecGeneratorResult> {
  // In interactive mode, use the create-spec skill for structured interview
  // In headless mode, use the embedded prompt for autonomous generation
  const useSkill = !options.headless;
  const prompt = useSkill
    ? `/create-spec\n\nDescription: ${options.description}`
    : SPEC_GENERATION_PROMPT.replace('{DESCRIPTION}', options.description) + HEADLESS_ADDENDUM;

  if (options.headless) {
    emitJson({ event: 'spec_generation_started', description: options.description });
  } else {
    console.log(`Generating SPEC for: ${options.description}\n`);
  }

  // Interactive mode: let Claude run with inherited stdio so AskUserQuestion works
  if (!options.headless) {
    return generateSpecInteractive(options, prompt);
  }

  // Headless mode: use stream-json for parsing
  return generateSpecHeadless(options, prompt);
}

async function generateSpecInteractive(
  options: SpecGeneratorOptions,
  prompt: string
): Promise<SpecGeneratorResult> {
  return new Promise((resolve) => {
    const args = [
      '--dangerously-skip-permissions',
      ...(options.model ? ['--model', options.model] : []),
    ];

    const proc: ChildProcess = spawn('claude', args, {
      cwd: options.cwd,
      env: process.env,
      stdio: ['pipe', 'inherit', 'inherit'], // pipe stdin, inherit stdout/stderr
    });

    // Send the prompt as initial input, but keep stdin open for follow-up
    proc.stdin?.write(prompt + '\n');

    // Pipe user's terminal input to Claude
    process.stdin.setRawMode?.(false);
    process.stdin.resume();
    process.stdin.pipe(proc.stdin!);

    const timeout = setTimeout(() => {
      proc.kill('SIGTERM');
      resolve({
        success: false,
        error: `Timeout: no progress for ${options.timeoutMs / 1000}s`,
      });
    }, options.timeoutMs);

    proc.on('close', (code) => {
      clearTimeout(timeout);

      // Cleanup stdin piping
      process.stdin.unpipe(proc.stdin!);
      process.stdin.pause();

      // Check if SPEC.md was created
      const specPath = join(options.cwd, 'SPEC.md');
      if (existsSync(specPath)) {
        const content = readFileSync(specPath, 'utf-8');
        const taskCount = (content.match(/^- \[ \]/gm) || []).length;

        const validation = validateSpecInDir(options.cwd);
        const validationOutput = formatValidationResult(validation);
        console.log('\nValidation:');
        console.log(validationOutput);

        resolve({
          success: true,
          specPath,
          taskCount,
          validationPassed: validation.valid,
          validationOutput,
        });
      } else {
        resolve({
          success: false,
          error: code === 0 ? 'SPEC.md was not created' : `Claude exited with code ${code}`,
        });
      }
    });
  });
}

async function generateSpecHeadless(
  options: SpecGeneratorOptions,
  prompt: string
): Promise<SpecGeneratorResult> {
  return new Promise((resolve) => {
    const args = [
      '--dangerously-skip-permissions',
      '--output-format',
      'stream-json',
      '--verbose',
      ...(options.model ? ['--model', options.model] : []),
      '-p',
      prompt,
    ];

    const proc: ChildProcess = spawn('claude', args, {
      cwd: options.cwd,
      env: process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    proc.stdin?.end();

    let output = '';
    let lastOutput = Date.now();

    const timeout = setTimeout(() => {
      proc.kill('SIGTERM');
      resolve({
        success: false,
        error: `Timeout: no progress for ${options.timeoutMs / 1000}s`,
      });
    }, options.timeoutMs);

    proc.stdout?.on('data', (data: Buffer) => {
      lastOutput = Date.now();
      output += data.toString();

      if (!options.headless) {
        const lines = data.toString().split('\n');
        for (const line of lines) {
          if (line.trim()) {
            try {
              const parsed = JSON.parse(line);
              if (parsed.type === 'assistant' && parsed.message?.content) {
                for (const block of parsed.message.content) {
                  if (block.type === 'text') {
                    process.stdout.write('.');
                  } else if (block.type === 'tool_use') {
                    process.stdout.write(`\n[${block.name}] `);
                  }
                }
              }
            } catch {
              // Not JSON, ignore
            }
          }
        }
      }
    });

    proc.stderr?.on('data', (data: Buffer) => {
      lastOutput = Date.now();
      if (!options.headless) {
        process.stderr.write(data);
      }
    });

    proc.on('close', (code) => {
      clearTimeout(timeout);

      if (!options.headless) {
        console.log('\n');
      }

      const specPath = join(options.cwd, 'SPEC.md');
      if (!existsSync(specPath)) {
        if (options.headless) {
          emitJson({ event: 'spec_generation_failed', error: 'SPEC.md was not created' });
        }
        resolve({
          success: false,
          error: 'SPEC.md was not created',
        });
        return;
      }

      const specContent = readFileSync(specPath, 'utf-8');
      const taskMatches = specContent.match(/^-\s*\[\s*\]\s+/gm);
      const taskCount = taskMatches ? taskMatches.length : 0;

      const validation = validateSpecInDir(options.cwd);
      const validationOutput = formatValidationResult(validation);

      if (options.headless) {
        emitJson({
          event: 'spec_generation_complete',
          specPath,
          taskCount,
          validationPassed: validation.valid,
          violations: validation.violations.length,
        });
      } else {
        console.log(`SPEC.md created with ${taskCount} tasks\n`);
        console.log('Validation:');
        console.log(validationOutput);
      }

      resolve({
        success: true,
        specPath,
        taskCount,
        validationPassed: validation.valid,
        validationOutput,
      });
    });

    proc.on('error', (err) => {
      clearTimeout(timeout);
      if (options.headless) {
        emitJson({ event: 'spec_generation_failed', error: err.message });
      }
      resolve({
        success: false,
        error: err.message,
      });
    });
  });
}
