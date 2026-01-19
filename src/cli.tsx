#!/usr/bin/env tsx
import React from 'react';
import { render } from 'ink';
import { Command } from 'commander';
import { readFileSync, existsSync, unlinkSync, copyFileSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read version from package.json
function getVersion(): string {
  try {
    // Try from dist location (npm installed)
    let pkgPath = join(__dirname, '..', 'package.json');
    if (!existsSync(pkgPath)) {
      // Try from src location (development)
      pkgPath = join(__dirname, '..', '..', 'package.json');
    }
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    return pkg.version || '1.0.0';
  } catch {
    return '1.0.0';
  }
}
import { IterationRunner } from './App.js';
import { runInit } from './commands/init.js';
import { validateProject } from './commands/run.js';
import { runUpgrade, detectVersion, getVersionName, CURRENT_VERSION } from './commands/upgrade.js';
import { createFeatureBranch } from './lib/git.js';
import { getSpecTitle } from './lib/spec-parser.js';
import { getSpecTitleV2 } from './lib/spec-parser-v2.js';
import { emitFailed } from './lib/headless-emitter.js';
import { executeHeadlessRun as runHeadless } from './lib/headless-runner.js';
import { validateSpecInDir, formatValidationResult } from './lib/spec-validator.js';
import { generateSpec } from './lib/spec-generator.js';
import { getHarnessName } from './lib/config-loader.js';
import {
  runStatus,
  formatStatus,
  runList,
  formatList,
  runArchive,
  formatArchive,
  runLessons,
} from './commands/spec-v2.js';
import { generateTaskContext } from './lib/prompt-generator.js';

export const DEFAULT_PROMPT = `You are Ralphie, an autonomous coding assistant.

## Your Task
Complete ONE task from specs/active/*.md per iteration. Tasks are identified by IDs like T001, T002, etc.

## The Loop
1. Read the spec in specs/active/ to find the next task with Status: pending
2. Write plan to .ai/ralphie/plan.md:
   - Goal: one sentence
   - Task ID: T###
   - Files: what you'll create/modify
   - Tests: what you'll test
   - Exit criteria: how you know you're done
3. Update the task's Status field: \`- Status: pending\` → \`- Status: in_progress\`
4. Implement the task with tests
5. Run the task's Verify command (found in **Verify:** section)
6. Run full test suite and type checks
7. Update the task's Status field: \`- Status: in_progress\` → \`- Status: passed\`
8. Commit with task ID in message (e.g., "feat: T001 add user validation")
9. Update .ai/ralphie/index.md (append commit summary) and STATE.txt

## Task Format in Spec
\`\`\`markdown
### T001: Task title
- Status: pending | in_progress | passed | failed
- Size: S | M | L

**Deliverables:**
- What to build (outcomes)

**Verify:** \`npm test -- task-name\`
\`\`\`

## Rules
- Plan BEFORE coding
- Run Verify command BEFORE marking passed
- Commit AFTER each task
- No TODO/FIXME stubs in completed tasks`;

export const GREEDY_PROMPT = `You are Ralphie, an autonomous coding assistant in GREEDY MODE.

## Your Task
Complete AS MANY tasks as possible from specs/active/*.md before context fills up. Tasks are identified by IDs like T001, T002, etc.

## The Loop (repeat until done or context full)
1. Read the spec in specs/active/ to find tasks with Status: pending
2. Write plan to .ai/ralphie/plan.md with Task ID
3. Update task Status: \`- Status: pending\` → \`- Status: in_progress\`
4. Implement the task with tests
5. Run the task's Verify command
6. Run full test suite and type checks
7. Update task Status: \`- Status: in_progress\` → \`- Status: passed\`
8. Commit with task ID in message
9. Update .ai/ralphie/index.md and STATE.txt
10. **CONTINUE to next task** (don't stop!)

## Task Format in Spec
\`\`\`markdown
### T001: Task title
- Status: pending | in_progress | passed | failed
- Size: S | M | L

**Deliverables:**
- What to build (outcomes)

**Verify:** \`npm test -- task-name\`
\`\`\`

## Rules
- Commit after EACH task (saves progress incrementally)
- Run Verify command BEFORE marking passed
- Keep going until all tasks done OR context is filling up
- No TODO/FIXME stubs in completed tasks
- The goal is maximum throughput - don't stop after one task`;

export interface RunOptions {
  iterations: number;
  all: boolean;
  prompt?: string;
  promptFile?: string;
  cwd: string;
  timeoutIdle: number;
  saveJsonl?: string;
  quiet: boolean;
  title?: string;
  noBranch: boolean;
  headless: boolean;
  stuckThreshold: number;
  model?: string;
  harness?: string;
  greedy: boolean;
  budget: number;
}

export type CliOptions = RunOptions;

export const MAX_ALL_ITERATIONS = 100;

export function resolvePrompt(options: RunOptions, specPath?: string): string {
  // Custom prompts bypass task context injection
  if (options.prompt) {
    return options.prompt;
  }

  if (options.promptFile) {
    const filePath = resolve(options.cwd, options.promptFile);
    if (!existsSync(filePath)) {
      throw new Error(`Prompt file not found: ${filePath}`);
    }
    return readFileSync(filePath, 'utf-8');
  }

  // Get base prompt
  const basePrompt = options.greedy ? GREEDY_PROMPT : DEFAULT_PROMPT;

  // Generate task context from spec and budget
  const taskContext = generateTaskContext(specPath, { budget: options.budget });

  // Append task context if available
  if (taskContext) {
    return `${basePrompt}\n\n${taskContext}`;
  }

  return basePrompt;
}

export function executeRun(options: RunOptions): void {
  const validation = validateProject(options.cwd);

  if (!validation.valid) {
    console.error('Cannot run Ralphie:');
    for (const error of validation.errors) {
      console.error(`  - ${error}`);
    }
    process.exit(1);
  }

  if (!options.noBranch && validation.specPath) {
    // Try V2 parser first, fall back to V1 for legacy specs
    const title = getSpecTitleV2(validation.specPath) ?? getSpecTitle(validation.specPath);
    if (title) {
      const result = createFeatureBranch(options.cwd, title);
      if (result.created) {
        console.log(`Created branch: ${result.branchName}`);
      } else if (result.branchName) {
        console.log(`Using branch: ${result.branchName}`);
      } else if (result.error) {
        console.warn(`Warning: ${result.error}`);
      }
    }
  }

  const prompt = resolvePrompt(options, validation.specPath);
  const idleTimeoutMs = options.timeoutIdle * 1000;

  const harness = options.harness ? getHarnessName(options.harness, options.cwd) : undefined;

  const { waitUntilExit, unmount } = render(
    <IterationRunner
      prompt={prompt}
      totalIterations={options.iterations}
      cwd={options.cwd}
      idleTimeoutMs={idleTimeoutMs}
      saveJsonl={options.saveJsonl}
      model={options.model}
      harness={harness}
    />
  );

  const handleSignal = (): void => {
    unmount();
    process.exit(0);
  };

  process.on('SIGINT', handleSignal);
  process.on('SIGTERM', handleSignal);

  waitUntilExit().then(() => {
    process.exit(0);
  });
}

export async function executeHeadlessRun(options: RunOptions): Promise<void> {
  const validation = validateProject(options.cwd);

  if (!validation.valid) {
    emitFailed(`Invalid project: ${validation.errors.join(', ')}`);
    process.exit(3);
  }

  const prompt = resolvePrompt(options, validation.specPath);
  const harness = options.harness ? getHarnessName(options.harness, options.cwd) : undefined;

  const exitCode = await runHeadless({
    prompt,
    cwd: options.cwd,
    iterations: options.iterations,
    stuckThreshold: options.stuckThreshold,
    idleTimeoutMs: options.timeoutIdle * 1000,
    saveJsonl: options.saveJsonl,
    model: options.model,
    harness,
  });

  process.exit(exitCode);
}

function main(): void {
  const program = new Command();

  program
    .name('ralphie')
    .description('Autonomous AI coding loops')
    .version(getVersion());

  program
    .command('init')
    .description('Initialize Ralphie in the current directory')
    .argument('[directory]', 'Target directory', process.cwd())
    .action((directory: string) => {
      const targetDir = resolve(directory);
      console.log(`Initializing Ralphie in ${targetDir}...\n`);

      try {
        const result = runInit(targetDir);

        if (result.created.length > 0) {
          console.log('Created:');
          for (const file of result.created) {
            console.log(`  + ${file}`);
          }
        }

        if (result.skipped.length > 0) {
          console.log('\nSkipped (already exist):');
          for (const file of result.skipped) {
            console.log(`  - ${file}`);
          }
        }

        console.log('\nRalphie initialized! Next steps:');
        console.log('  1. Create SPEC.md with your project tasks');
        console.log('  2. Run: ralphie run');
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  program
    .command('run')
    .description('Run Ralphie iterations')
    .option('-n, --iterations <number>', 'Number of iterations to run', '1')
    .option('-a, --all', 'Run until all PRD tasks are complete (max 100 iterations)')
    .option('-p, --prompt <text>', 'Prompt to send to Claude')
    .option('--prompt-file <path>', 'Read prompt from file')
    .option('--cwd <path>', 'Working directory for Claude', process.cwd())
    .option('--timeout-idle <seconds>', 'Kill process after N seconds of no output', '120')
    .option('--save-jsonl <path>', 'Save raw JSONL output to file')
    .option('--quiet', 'Suppress output (just run iterations)', false)
    .option('--title <text>', 'Override task title display')
    .option('--no-branch', 'Skip feature branch creation')
    .option('--headless', 'Output JSON events instead of UI')
    .option('--stuck-threshold <n>', 'Iterations without progress before stuck (headless)', '3')
    .option('-m, --model <name>', 'Claude model to use (sonnet, opus, haiku)', 'sonnet')
    .option('--harness <name>', 'AI harness to use (claude, codex, opencode)')
    .option('-g, --greedy', 'Complete multiple tasks per iteration until context fills')
    .option('--budget <points>', 'Size points budget per iteration (default 4)', '4')
    .action((opts) => {
      let iterations = parseInt(opts.iterations, 10);
      const all = opts.all ?? false;

      if (all) {
        iterations = MAX_ALL_ITERATIONS;
        console.log(`Running until PRD complete (max ${MAX_ALL_ITERATIONS} iterations)...\n`);
      }

      const options: RunOptions = {
        iterations,
        all,
        prompt: opts.prompt,
        promptFile: opts.promptFile,
        cwd: resolve(opts.cwd),
        timeoutIdle: parseInt(opts.timeoutIdle, 10),
        saveJsonl: opts.saveJsonl,
        quiet: opts.quiet,
        title: opts.title,
        noBranch: opts.branch === false,
        headless: opts.headless ?? false,
        stuckThreshold: parseInt(opts.stuckThreshold, 10),
        model: opts.model,
        harness: opts.harness,
        greedy: opts.greedy ?? false,
        budget: parseInt(opts.budget, 10),
      };

      if (options.headless) {
        executeHeadlessRun(options);
      } else {
        executeRun(options);
      }
    });

  program
    .command('validate')
    .description('Check if current directory is ready for Ralphie and validate SPEC.md conventions')
    .option('--cwd <path>', 'Working directory to check', process.cwd())
    .option('--spec-only', 'Only validate SPEC.md content (skip project structure check)', false)
    .action((opts) => {
      const cwd = resolve(opts.cwd);
      let hasErrors = false;

      if (!opts.specOnly) {
        const projectResult = validateProject(cwd);
        if (!projectResult.valid) {
          console.log('Project structure issues:');
          for (const error of projectResult.errors) {
            console.log(`  - ${error}`);
          }
          hasErrors = true;
        } else {
          console.log('✓ Project structure is valid');
        }
      }

      const specResult = validateSpecInDir(cwd);
      console.log('\nSPEC.md content validation:');
      console.log(formatValidationResult(specResult));

      if (!specResult.valid) {
        hasErrors = true;
      }

      if (hasErrors) {
        process.exit(1);
      }
    });

  program
    .command('spec')
    .description('Generate a SPEC.md autonomously from a description')
    .argument('<description>', 'What to build (e.g., "REST API for user management")')
    .option('--cwd <path>', 'Working directory', process.cwd())
    .option('--headless', 'Output JSON events instead of UI', false)
    .option('--timeout <seconds>', 'Timeout for generation', '300')
    .option('-m, --model <name>', 'Claude model to use (sonnet, opus, haiku)', 'opus')
    .option('--harness <name>', 'AI harness to use: claude, codex, opencode', 'claude')
    .action(async (description: string, opts) => {
      const cwd = resolve(opts.cwd);

      const result = await generateSpec({
        description,
        cwd,
        headless: opts.headless ?? false,
        timeoutMs: parseInt(opts.timeout, 10) * 1000,
        model: opts.model,
        harness: opts.harness,
      });

      if (!result.success) {
        if (!opts.headless) {
          console.error(`Failed: ${result.error}`);
        }
        process.exit(1);
      }

      if (!result.validationPassed && !opts.headless) {
        console.log('\nWarning: SPEC has convention violations. Run `ralphie validate` for details.');
      }

      process.exit(0);
    });

  program
    .command('spec-list')
    .description('List active and completed specs')
    .option('--cwd <path>', 'Working directory', process.cwd())
    .action((opts) => {
      const cwd = resolve(opts.cwd);
      try {
        const result = runList(cwd);
        console.log(formatList(result));
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : err}`);
        process.exit(1);
      }
    });

  program
    .command('status')
    .description('Show progress of active spec')
    .option('--cwd <path>', 'Working directory', process.cwd())
    .option('--json', 'Output as JSON', false)
    .action((opts) => {
      const cwd = resolve(opts.cwd);
      try {
        const result = runStatus(cwd);
        if (opts.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(formatStatus(result));
        }
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : err}`);
        process.exit(1);
      }
    });

  program
    .command('archive')
    .description('Archive completed spec to specs/completed/')
    .option('--cwd <path>', 'Working directory', process.cwd())
    .action((opts) => {
      const cwd = resolve(opts.cwd);
      try {
        const result = runArchive(cwd);
        console.log(formatArchive(result));
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : err}`);
        process.exit(1);
      }
    });

  program
    .command('lessons')
    .description('View or add to lessons learned')
    .option('--cwd <path>', 'Working directory', process.cwd())
    .option('--add <lesson>', 'Add a new lesson')
    .action((opts) => {
      const cwd = resolve(opts.cwd);
      try {
        const result = runLessons(cwd, opts.add);
        console.log(result);
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : err}`);
        process.exit(1);
      }
    });

  program
    .command('upgrade')
    .description(`Upgrade a Ralphie project to the latest version (v${CURRENT_VERSION})`)
    .argument('[directory]', 'Target directory', process.cwd())
    .option('--dry-run', 'Show what would be changed without making changes', false)
    .option('--clean', 'Remove legacy files after confirming project is at latest version', false)
    .action((directory: string, opts) => {
      const targetDir = resolve(directory);

      const detection = detectVersion(targetDir);

      if (detection.detectedVersion === null) {
        console.log('Could not detect Ralphie project version.');
        console.log('If this is a new project, use: ralphie init');
        return;
      }

      if (detection.isLatest && !detection.hasLegacyFiles) {
        const claudeDir = resolve(targetDir, '.claude');
        const ralphieMdPath = resolve(claudeDir, 'ralphie.md');

        if (existsSync(ralphieMdPath)) {
          const content = readFileSync(ralphieMdPath, 'utf-8');
          const hasOldPatterns = /\bPRD\b/.test(content) || /\bprogress\.txt\b/.test(content);

          if (hasOldPatterns) {
            console.log(`Project is at ${getVersionName(detection.detectedVersion)} but .claude/ralphie.md has old patterns.`);

            if (opts.clean) {
              const templatesDir = resolve(__dirname, '..', 'templates');
              const templatePath = resolve(templatesDir, '.claude', 'ralphie.md');
              if (existsSync(templatePath)) {
                copyFileSync(templatePath, ralphieMdPath);
                console.log('Updated .claude/ralphie.md to v2 template.');
              }
            } else {
              console.log('Run with --clean to update it.');
            }
            return;
          }
        }

        console.log(`Project is already at ${getVersionName(detection.detectedVersion)} (latest)`);
        return;
      }

      if (detection.isLatest && detection.hasLegacyFiles) {
        console.log(`Project is at ${getVersionName(detection.detectedVersion)} but has legacy files:`);
        for (const file of detection.legacyFiles) {
          console.log(`  - ${file}`);
        }
        console.log('\nRun with --clean to remove them, or delete manually.');

        if (opts.clean) {
          console.log('\nCleaning up legacy files...');
          for (const file of detection.legacyFiles) {
            const filePath = resolve(targetDir, file);
            try {
              unlinkSync(filePath);
              console.log(`  Removed: ${file}`);
            } catch {
              console.log(`  Failed to remove: ${file}`);
            }
          }
          console.log('\nCleanup complete!');
        }
        return;
      }

      console.log(`Detected: ${getVersionName(detection.detectedVersion)}`);
      console.log(`Target:   ${getVersionName(CURRENT_VERSION)}\n`);
      console.log(`Found files: ${detection.foundIndicators.join(', ')}\n`);

      if (opts.dryRun) {
        console.log('Dry run - would upgrade from:');
        console.log(`  ${getVersionName(detection.detectedVersion)} → ${getVersionName(CURRENT_VERSION)}`);
        return;
      }

      try {
        const result = runUpgrade(targetDir);

        console.log(`Upgraded: v${result.fromVersion} → v${result.toVersion}\n`);

        if (result.renamed.length > 0) {
          console.log('Renamed:');
          for (const { from, to } of result.renamed) {
            console.log(`  ${from} → ${to}`);
          }
        }

        if (result.created.length > 0) {
          console.log('\nCreated:');
          for (const file of result.created) {
            console.log(`  + ${file}`);
          }
        }

        if (result.skipped.length > 0) {
          console.log('\nSkipped:');
          for (const file of result.skipped) {
            console.log(`  - ${file}`);
          }
        }

        if (result.warnings.length > 0) {
          console.log('\nWarnings:');
          for (const warning of result.warnings) {
            console.log(`  ⚠ ${warning}`);
          }
        }

        console.log('\nUpgrade complete! Run: ralphie validate');
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  if (process.argv.length === 2) {
    program.help();
  }

  program.parse(process.argv);
}

if (process.env.NODE_ENV !== 'test') {
  main();
}
