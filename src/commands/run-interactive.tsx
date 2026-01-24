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
import { validateHarnessEnv, getHarness } from '../lib/harness/index.js';
import { resolvePrompt, type RunOptions } from '../cli.js';
import { runReview } from '../lib/review.js';

export async function executeRun(options: RunOptions): Promise<void> {
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

  const harnessName = options.harness ? getHarnessName(options.harness, options.cwd) : 'claude';

  const envValidation = validateHarnessEnv(harnessName);
  if (!envValidation.valid) {
    console.error(envValidation.message);
    process.exit(1);
  }

  // Run review if --review flag is set
  if (options.review) {
    console.log('Running multi-agent review...\n');

    const harness = getHarness(harnessName);
    const reviewSummary = await runReview(harness, options.cwd, options.model);

    // Check for P1 issues
    if (reviewSummary.hasP1Issues && !options.force) {
      console.error(`\n❌ Found ${reviewSummary.p1Count} P1 issue(s). Review blocked.`);
      console.error('Fix critical/high severity issues before running, or use --force to override.\n');
      process.exit(1);
    }

    if (reviewSummary.hasP1Issues && options.force) {
      console.warn(`\n⚠️  Found ${reviewSummary.p1Count} P1 issue(s), but continuing due to --force flag.\n`);
    }
  }

  const prompt = resolvePrompt(options, validation.specPath);
  const idleTimeoutMs = options.timeoutIdle * 1000;

  const { waitUntilExit, unmount } = render(
    <IterationRunner
      prompt={prompt}
      totalIterations={options.iterations}
      cwd={options.cwd}
      idleTimeoutMs={idleTimeoutMs}
      saveJsonl={options.saveJsonl}
      model={options.model}
      harness={harnessName}
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
