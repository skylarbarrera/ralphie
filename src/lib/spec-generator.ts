import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { validateSpecInDir, formatValidationResult } from './spec-validator.js';
import { getHarness } from './harness/index.js';
import type { HarnessEvent, HarnessName } from './harness/types.js';

export interface SpecGeneratorOptions {
  description: string;
  cwd: string;
  headless: boolean;
  timeoutMs: number;
  model?: string;
  harness?: HarnessName;
}

export interface SpecGeneratorResult {
  success: boolean;
  specPath?: string;
  taskCount?: number;
  validationPassed?: boolean;
  validationOutput?: string;
  error?: string;
}

function emitJson(event: Record<string, unknown>): void {
  console.log(JSON.stringify({ ...event, timestamp: new Date().toISOString() }));
}

/**
 * Check if output contains completion marker.
 */
function hasCompletionMarker(outputBuffer: string): boolean {
  return outputBuffer.includes('SPEC_COMPLETE');
}

/**
 * Generate a SPEC.md using the spec-autonomous skill via harness.
 *
 * The skill analyzes the codebase and infers requirements from the description.
 * For interactive spec generation, users should run /spec-interactive directly.
 */
export async function generateSpec(options: SpecGeneratorOptions): Promise<SpecGeneratorResult> {
  const harness = getHarness(options.harness ?? 'claude');
  const specPath = join(options.cwd, 'SPEC.md');

  // Always use autonomous mode - CLI is headless by definition
  const prompt = `/spec-autonomous

Description: ${options.description}`;

  if (options.headless) {
    emitJson({
      event: 'spec_generation_started',
      description: options.description,
    });
  } else {
    console.log(`Generating SPEC for: ${options.description}\n`);
    console.log('Autonomous mode: Claude will infer requirements from codebase.\n');
  }

  let outputBuffer = '';

  const onEvent = (event: HarnessEvent) => {
    // Capture output to check for completion marker
    if (event.type === 'message') {
      outputBuffer += event.text;
    }

    if (!options.headless) {
      if (event.type === 'tool_start') {
        process.stdout.write(`\n[${event.name}] `);
      } else if (event.type === 'message') {
        process.stdout.write('.');
      }
    }
  };

  try {
    const result = await harness.run(
      prompt,
      {
        cwd: options.cwd,
        model: options.model,
        interactive: false,
      },
      onEvent
    );

    if (!options.headless) {
      console.log('\n');
    }

    // Check if SPEC.md was created
    if (!existsSync(specPath)) {
      const error = 'SPEC.md was not created. The skill may have failed to generate it.';
      if (options.headless) {
        emitJson({ event: 'spec_generation_failed', error });
      } else {
        console.error(error);
      }
      return {
        success: false,
        error,
      };
    }

    // Parse and validate the spec
    const specContent = readFileSync(specPath, 'utf-8');
    const taskMatches = specContent.match(/^-\s*\[\s*\]\s+/gm);
    const taskCount = taskMatches ? taskMatches.length : 0;

    const validation = validateSpecInDir(options.cwd);
    const validationOutput = formatValidationResult(validation);

    // Check for completion marker from skill
    const completed = hasCompletionMarker(outputBuffer);
    const success = result.success && taskCount > 0 && completed;

    if (options.headless) {
      emitJson({
        event: success ? 'spec_generation_complete' : 'spec_generation_warning',
        specPath,
        taskCount,
        validationPassed: validation.valid,
        violations: validation.violations.length,
        completed,
      });
    } else {
      console.log(`SPEC.md created with ${taskCount} tasks\n`);
      console.log('Validation:');
      console.log(validationOutput);

      if (!completed) {
        console.log('\nWarning: Skill did not output SPEC_COMPLETE marker.');
        console.log('Consider reviewing the spec manually.');
      }
    }

    return {
      success,
      specPath,
      taskCount,
      validationPassed: validation.valid,
      validationOutput,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    if (options.headless) {
      emitJson({ event: 'spec_generation_failed', error: errorMessage });
    } else {
      console.error(`Error: ${errorMessage}`);
    }
    return {
      success: false,
      error: errorMessage,
    };
  }
}
