import { spawn, type ChildProcess } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { validateSpecInDir, formatValidationResult } from './spec-validator.js';

export interface SpecGeneratorOptions {
  description: string;
  cwd: string;
  headless: boolean;
  autonomous?: boolean;
  timeoutMs: number;
  maxAttempts?: number;
  model?: string;
}

export interface SpecGeneratorResult {
  success: boolean;
  specPath?: string;
  taskCount?: number;
  validationPassed?: boolean;
  validationOutput?: string;
  reviewPassed?: boolean;
  attempts?: number;
  error?: string;
}

const SPEC_GENERATION_PROMPT = `You are generating a SPEC.md for a Ralphie project. Your task is to create a well-structured specification based on the user's description.

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

Each checkbox = one Ralphie iteration. Batch related work:

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
  // Autonomous mode: generate spec with review loop
  if (options.autonomous) {
    return generateSpecAutonomous(options);
  }

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

interface ReviewResult {
  passed: boolean;
  concerns: string[];
  fullOutput: string;
}

async function runReviewSpec(specPath: string, cwd: string, model?: string): Promise<ReviewResult> {
  return new Promise((resolve) => {
    const args = [
      '--dangerously-skip-permissions',
      '--output-format',
      'stream-json',
      '--verbose',
      ...(model ? ['--model', model] : []),
      '-p',
      `/review-spec ${specPath}`,
    ];

    const proc = spawn('claude', args, {
      cwd,
      env: process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    proc.stdin?.end();

    let output = '';

    proc.stdout?.on('data', (data: Buffer) => {
      output += data.toString();
    });

    proc.on('close', () => {
      // Parse the output to extract PASS/FAIL and concerns
      const result = parseReviewOutput(output);
      resolve(result);
    });

    proc.on('error', () => {
      resolve({
        passed: false,
        concerns: ['Failed to run review-spec skill'],
        fullOutput: output,
      });
    });
  });
}

function parseReviewOutput(output: string): ReviewResult {
  // Look for "SPEC Review: PASS" or "SPEC Review: FAIL" in the output
  const passMatch = /SPEC Review:\s*PASS/i.test(output);
  const failMatch = /SPEC Review:\s*FAIL/i.test(output);

  if (passMatch && !failMatch) {
    return {
      passed: true,
      concerns: [],
      fullOutput: output,
    };
  }

  // Extract concerns from the output
  const concerns: string[] = [];

  // Look for format issues
  const formatSection = output.match(/## Format Issues\s+([\s\S]*?)(?=##|$)/i);
  if (formatSection) {
    concerns.push('Format issues found:\n' + formatSection[1].trim());
  }

  // Look for content concerns
  const contentSection = output.match(/## Content Concerns\s+([\s\S]*?)(?=##|$)/i);
  if (contentSection) {
    concerns.push('Content concerns:\n' + contentSection[1].trim());
  }

  // Look for recommendations
  const recommendationsSection = output.match(/## Recommendations\s+([\s\S]*?)(?=##|$)/i);
  if (recommendationsSection) {
    concerns.push('Recommendations:\n' + recommendationsSection[1].trim());
  }

  return {
    passed: false,
    concerns: concerns.length > 0 ? concerns : ['Review failed but no specific concerns extracted'],
    fullOutput: output,
  };
}

async function refineSpec(
  description: string,
  currentSpec: string,
  concerns: string[],
  cwd: string,
  model?: string
): Promise<boolean> {
  const refinementPrompt = `You previously generated a SPEC.md that has issues. Please revise it based on this feedback:

${concerns.join('\n\n')}

Original Description: ${description}

Current SPEC content:
${currentSpec}

Generate an improved SPEC.md that addresses all the concerns above. Write the updated SPEC.md to the file.`;

  return new Promise((resolve) => {
    const args = [
      '--dangerously-skip-permissions',
      '--output-format',
      'stream-json',
      '--verbose',
      ...(model ? ['--model', model] : []),
      '-p',
      refinementPrompt,
    ];

    const proc = spawn('claude', args, {
      cwd,
      env: process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    proc.stdin?.end();

    proc.on('close', (code) => {
      const specPath = join(cwd, 'SPEC.md');
      resolve(code === 0 && existsSync(specPath));
    });

    proc.on('error', () => {
      resolve(false);
    });
  });
}

async function generateSpecAutonomous(options: SpecGeneratorOptions): Promise<SpecGeneratorResult> {
  const maxAttempts = options.maxAttempts ?? 3;
  const specPath = join(options.cwd, 'SPEC.md');

  if (options.headless) {
    emitJson({ event: 'autonomous_spec_started', description: options.description, maxAttempts });
  } else {
    console.log(`Generating SPEC autonomously: ${options.description}`);
    console.log(`Max attempts: ${maxAttempts}\n`);
  }

  // Step 1: Generate initial SPEC
  if (!options.headless) {
    console.log('Attempt 1: Generating initial SPEC...');
  }

  const initialPrompt = SPEC_GENERATION_PROMPT.replace('{DESCRIPTION}', options.description) + HEADLESS_ADDENDUM;
  const initialResult = await generateSpecHeadless(
    { ...options, headless: true },
    initialPrompt
  );

  if (!initialResult.success) {
    if (options.headless) {
      emitJson({ event: 'autonomous_spec_failed', error: initialResult.error, attempts: 1 });
    }
    return {
      ...initialResult,
      attempts: 1,
    };
  }

  // Step 2: Review loop
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (!options.headless) {
      console.log(`\nAttempt ${attempt}: Running review...`);
    }

    if (options.headless) {
      emitJson({ event: 'autonomous_review_started', attempt });
    }

    const reviewResult = await runReviewSpec(specPath, options.cwd, options.model);

    if (reviewResult.passed) {
      if (!options.headless) {
        console.log(`\n✓ Review passed on attempt ${attempt}!`);
      }

      if (options.headless) {
        emitJson({ event: 'autonomous_spec_complete', attempts: attempt, reviewPassed: true });
      }

      return {
        success: true,
        specPath,
        taskCount: initialResult.taskCount,
        validationPassed: initialResult.validationPassed,
        reviewPassed: true,
        attempts: attempt,
      };
    }

    if (!options.headless) {
      console.log(`✗ Review failed on attempt ${attempt}`);
      console.log('Concerns:');
      for (const concern of reviewResult.concerns) {
        console.log(`  - ${concern.split('\n')[0]}`);
      }
    }

    if (options.headless) {
      emitJson({
        event: 'autonomous_review_failed',
        attempt,
        concerns: reviewResult.concerns.length,
      });
    }

    // If this was the last attempt, exit with failure
    if (attempt === maxAttempts) {
      if (options.headless) {
        emitJson({
          event: 'autonomous_spec_failed',
          error: 'Max attempts reached without passing review',
          attempts: maxAttempts,
        });
      } else {
        console.log(`\n✗ Failed to generate valid SPEC after ${maxAttempts} attempts`);
      }

      return {
        success: false,
        error: `Max attempts (${maxAttempts}) reached without passing review`,
        reviewPassed: false,
        attempts: maxAttempts,
      };
    }

    // Refine the SPEC based on concerns
    if (!options.headless) {
      console.log(`\nAttempt ${attempt + 1}: Refining SPEC...`);
    }

    const currentSpec = readFileSync(specPath, 'utf-8');
    const refined = await refineSpec(
      options.description,
      currentSpec,
      reviewResult.concerns,
      options.cwd,
      options.model
    );

    if (!refined) {
      if (options.headless) {
        emitJson({
          event: 'autonomous_spec_failed',
          error: 'Refinement failed',
          attempts: attempt + 1,
        });
      }

      return {
        success: false,
        error: 'Failed to refine SPEC',
        attempts: attempt + 1,
      };
    }
  }

  // Should never reach here, but TypeScript needs a return
  return {
    success: false,
    error: 'Unexpected error in autonomous generation',
    attempts: maxAttempts,
  };
}
