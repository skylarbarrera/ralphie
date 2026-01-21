#!/usr/bin/env tsx
import 'dotenv/config';
import { Command } from 'commander';
import { readFileSync, existsSync } from 'fs';
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
import { runInit } from './commands/init.js';
import { validateProject } from './commands/run.js';
import { emitFailed } from './lib/headless-emitter.js';
import { executeHeadlessRun as runHeadless } from './lib/headless-runner.js';
import { validateSpecInDir, formatValidationResult } from './lib/spec-validator.js';
import { generateSpec } from './lib/spec-generator.js';
import { getHarnessName } from './lib/config-loader.js';
import { validateHarnessEnv } from './lib/harness/index.js';
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
import { DEFAULT_PROMPT, GREEDY_PROMPT } from './lib/prompts.js';
import { executeRun } from './commands/run-interactive.js'; // .tsx compiled to .js

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

export async function executeHeadlessRun(options: RunOptions): Promise<void> {
  const validation = validateProject(options.cwd);

  if (!validation.valid) {
    emitFailed(`Invalid project: ${validation.errors.join(', ')}`);
    process.exit(3);
  }

  const prompt = resolvePrompt(options, validation.specPath);
  const harness = options.harness ? getHarnessName(options.harness, options.cwd) : undefined;

  const envValidation = validateHarnessEnv(harness ?? 'claude');
  if (!envValidation.valid) {
    emitFailed(envValidation.message);
    process.exit(1);
  }

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

        // Show global directory info
        if (result.globalDirectory) {
          if (result.globalDirectory.created) {
            console.log(`\n✓ Created global directory: ${result.globalDirectory.path}`);
          } else {
            console.log(`\n✓ Using existing global directory: ${result.globalDirectory.path}`);
          }
        }

        console.log('\nRalphie initialized! Next steps:');
        console.log('  1. Create a spec:');
        console.log('     ralphie spec "your project idea"    # autonomous');
        console.log('     /ralphie-spec "your project idea"   # interactive (requires skill)');
        console.log('  2. Run: ralphie run --all');
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
    .description('Check if current directory is ready for Ralphie and validate spec format')
    .option('--cwd <path>', 'Working directory to check', process.cwd())
    .option('--spec-only', 'Only validate spec content (skip project structure check)', false)
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
      console.log('\nSpec content validation:');
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
    .description('Generate a spec autonomously from a description')
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

  if (process.argv.length === 2) {
    program.help();
  }

  program.parse(process.argv);
}

if (process.env.NODE_ENV !== 'test') {
  main();
}
