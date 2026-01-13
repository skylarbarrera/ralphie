#!/usr/bin/env tsx
import React from 'react';
import { render } from 'ink';
import { Command } from 'commander';
import { readFileSync, existsSync, unlinkSync, copyFileSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { IterationRunner } from './App.js';
import { runInit } from './commands/init.js';
import { validateProject } from './commands/run.js';
import { runUpgrade, detectVersion, getVersionName, CURRENT_VERSION } from './commands/upgrade.js';
import { createFeatureBranch } from './lib/git.js';
import { getSpecTitle } from './lib/spec-parser.js';
import { emitFailed } from './lib/headless-emitter.js';
import { executeHeadlessRun as runHeadless } from './lib/headless-runner.js';

export const DEFAULT_PROMPT = `You are Ralph, an autonomous coding assistant running in a loop.

1. Read SPEC.md and find the next incomplete task (check STATE.txt if unsure what's done).
2. Write plan to .ai/ralph/plan.md (goal, files, tests, exit criteria).
3. Implement the task with tests.
4. Run tests and type checks.
5. Commit your changes with a clear message.
6. Update .ai/ralph/index.md, SPEC.md, and STATE.txt.

ONE CHECKBOX = ONE ITERATION. If a task has sub-bullets, complete ALL of them before marking the checkbox done. Sub-bullets are implementation details for that task, not separate iterations.`;

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
}

export type CliOptions = RunOptions;

export const MAX_ALL_ITERATIONS = 100;

export function resolvePrompt(options: RunOptions): string {
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

  return DEFAULT_PROMPT;
}

export function executeRun(options: RunOptions): void {
  const validation = validateProject(options.cwd);

  if (!validation.valid) {
    console.error('Cannot run Ralph:');
    for (const error of validation.errors) {
      console.error(`  - ${error}`);
    }
    process.exit(1);
  }

  if (!options.noBranch) {
    const specPath = join(options.cwd, 'SPEC.md');
    const title = getSpecTitle(specPath);
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

  const prompt = resolvePrompt(options);
  const idleTimeoutMs = options.timeoutIdle * 1000;

  const { waitUntilExit, unmount } = render(
    <IterationRunner
      prompt={prompt}
      totalIterations={options.iterations}
      cwd={options.cwd}
      idleTimeoutMs={idleTimeoutMs}
      saveJsonl={options.saveJsonl}
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

  const prompt = resolvePrompt(options);
  const exitCode = await runHeadless({
    prompt,
    cwd: options.cwd,
    iterations: options.iterations,
    stuckThreshold: options.stuckThreshold,
    idleTimeoutMs: options.timeoutIdle * 1000,
    saveJsonl: options.saveJsonl,
  });

  process.exit(exitCode);
}

function main(): void {
  const program = new Command();

  program
    .name('ralph')
    .description('Autonomous AI coding loops')
    .version('0.3.0');

  program
    .command('init')
    .description('Initialize Ralph in the current directory')
    .argument('[directory]', 'Target directory', process.cwd())
    .action((directory: string) => {
      const targetDir = resolve(directory);
      console.log(`Initializing Ralph in ${targetDir}...\n`);

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

        console.log('\nRalph initialized! Next steps:');
        console.log('  1. Create SPEC.md with your project tasks');
        console.log('  2. Run: ralph run');
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  program
    .command('run')
    .description('Run Ralph iterations')
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
      };

      if (options.headless) {
        executeHeadlessRun(options);
      } else {
        executeRun(options);
      }
    });

  program
    .command('validate')
    .description('Check if current directory is ready for Ralph')
    .option('--cwd <path>', 'Working directory to check', process.cwd())
    .action((opts) => {
      const cwd = resolve(opts.cwd);
      const result = validateProject(cwd);

      if (result.valid) {
        console.log('Project is ready for Ralph!');
      } else {
        console.log('Issues found:');
        for (const error of result.errors) {
          console.log(`  - ${error}`);
        }
        process.exit(1);
      }
    });

  program
    .command('upgrade')
    .description(`Upgrade a Ralph project to the latest version (v${CURRENT_VERSION})`)
    .argument('[directory]', 'Target directory', process.cwd())
    .option('--dry-run', 'Show what would be changed without making changes', false)
    .option('--clean', 'Remove legacy files after confirming project is at latest version', false)
    .action((directory: string, opts) => {
      const targetDir = resolve(directory);

      const detection = detectVersion(targetDir);

      if (detection.detectedVersion === null) {
        console.log('Could not detect Ralph project version.');
        console.log('If this is a new project, use: ralph init');
        return;
      }

      if (detection.isLatest && !detection.hasLegacyFiles) {
        const claudeDir = resolve(targetDir, '.claude');
        const ralphMdPath = resolve(claudeDir, 'ralph.md');

        if (existsSync(ralphMdPath)) {
          const content = readFileSync(ralphMdPath, 'utf-8');
          const hasOldPatterns = /\bPRD\b/.test(content) || /\bprogress\.txt\b/.test(content);

          if (hasOldPatterns) {
            console.log(`Project is at ${getVersionName(detection.detectedVersion)} but .claude/ralph.md has old patterns.`);

            if (opts.clean) {
              const templatesDir = resolve(__dirname, '..', 'templates');
              const templatePath = resolve(templatesDir, '.claude', 'ralph.md');
              if (existsSync(templatePath)) {
                copyFileSync(templatePath, ralphMdPath);
                console.log('Updated .claude/ralph.md to v2 template.');
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

        console.log('\nUpgrade complete! Run: ralph validate');
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
