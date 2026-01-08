#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { Command } from 'commander';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { IterationRunner } from './App.js';

export const DEFAULT_PROMPT = `You are Ralph, an autonomous coding assistant running in a loop.

Read PRD.md and progress.txt to understand the project and what has been completed.
Find the next incomplete task from the PRD checklist.
Implement the task fully:
- Write the code
- Write tests
- Ensure tests pass
- Commit your changes with a clear message

After completing the task:
- Update progress.txt with what you accomplished
- Mark the task complete in PRD.md

Work on ONE task per iteration. Be thorough and systematic.`;

export interface CliOptions {
  iterations: number;
  prompt?: string;
  promptFile?: string;
  cwd: string;
  timeoutIdle: number;
  saveJsonl?: string;
  quiet: boolean;
  title?: string;
}

export function parseArgs(argv: string[]): CliOptions {
  const program = new Command();

  program
    .name('ralph')
    .description('CLI wrapper for Claude with real-time progress display')
    .version('0.1.0')
    .option('-n, --iterations <number>', 'Number of iterations to run', '1')
    .option('-p, --prompt <text>', 'Prompt to send to Claude')
    .option('--prompt-file <path>', 'Read prompt from file')
    .option('--cwd <path>', 'Working directory for Claude', process.cwd())
    .option('--timeout-idle <seconds>', 'Kill process after N seconds of no output', '120')
    .option('--save-jsonl <path>', 'Save raw JSONL output to file')
    .option('--quiet', 'Suppress output (just run iterations)', false)
    .option('--title <text>', 'Override task title display');

  program.parse(argv);
  const opts = program.opts();

  return {
    iterations: parseInt(opts.iterations, 10),
    prompt: opts.prompt,
    promptFile: opts.promptFile,
    cwd: opts.cwd,
    timeoutIdle: parseInt(opts.timeoutIdle, 10),
    saveJsonl: opts.saveJsonl,
    quiet: opts.quiet,
    title: opts.title,
  };
}

export function resolvePrompt(options: CliOptions): string {
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

export function run(options: CliOptions): void {
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

const isMainModule = process.argv[1]?.endsWith('cli.tsx') ||
                     process.argv[1]?.endsWith('cli.js');

if (isMainModule) {
  const options = parseArgs(process.argv);
  run(options);
}
