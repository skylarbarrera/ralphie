/**
 * Interactive run command - executes Ralphie with Ink UI
 */

import React from 'react';
import { render } from 'ink';
import { IterationRunner } from '../App.js';
import { validateProject } from './run.js';
import { createFeatureBranch } from '../lib/git.js';
import { getSpecTitleV2 } from '../lib/spec-parser-v2.js';
import { getHarnessName } from '../lib/config-loader.js';
import { resolvePrompt, type RunOptions } from '../cli.js';

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
    const title = getSpecTitleV2(validation.specPath);
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
