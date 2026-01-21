import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { validateSpecInDir, formatValidationResult } from './spec-validator.js';
import { getHarness } from './harness/index.js';
import type { HarnessEvent, HarnessName } from './harness/types.js';
import { conductResearch, injectResearchContext } from './research-orchestrator.js';

export interface SpecGeneratorOptions {
  description: string;
  cwd: string;
  headless: boolean;
  timeoutMs: number;
  model?: string;
  harness?: HarnessName;
  skipResearch?: boolean;
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
 * Generate a spec using the harness in autonomous mode.
 *
 * Analyzes the codebase and infers requirements from the description.
 * For interactive spec generation with user interview, run /ralphie-spec directly.
 */
export async function generateSpec(options: SpecGeneratorOptions): Promise<SpecGeneratorResult> {
  const harness = getHarness(options.harness ?? 'claude');

  // Generate kebab-case filename from description
  const specName = options.description
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50);
  const specPath = join(options.cwd, 'specs', 'active', `${specName}.md`);

  // Conduct research phase before spec generation
  let researchContext = '';
  try {
    researchContext = await conductResearch(
      harness,
      options.description,
      options.cwd,
      options.skipResearch || false
    );
  } catch (error) {
    // Research failures are non-fatal, continue with spec generation
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (!options.headless) {
      console.warn(`Research phase failed: ${errorMsg}`);
      console.warn('Continuing with spec generation without research context...\n');
    }
  }

  // Autonomous spec generation prompt (no user interaction)
  let prompt = `Generate a V2 format spec for: ${options.description}

Write the spec to: specs/active/${specName}.md

Use this V2 format:
\`\`\`markdown
# Feature Name

Goal: One-sentence description.

## Context

Background for implementation.

## Tasks

### T001: First task
- Status: pending
- Size: S|M|L

**Deliverables:**
- What to build

**Verify:** \`test command\`

---

(more tasks...)

## Acceptance Criteria

- WHEN X, THEN Y
\`\`\`

Analyze the codebase to understand context. Create 3-8 well-sized tasks.
When done, output: SPEC_COMPLETE`;

  // Inject research context into prompt if available
  if (researchContext) {
    prompt = injectResearchContext(prompt, researchContext);
  }

  if (options.headless) {
    emitJson({
      event: 'spec_generation_started',
      description: options.description,
    });
  } else {
    console.log(`Generating spec for: ${options.description}\n`);
    console.log('Autonomous mode: AI will infer requirements from codebase.\n');
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

    // Check if spec was created
    if (!existsSync(specPath)) {
      const error = `Spec was not created at ${specPath}. Generation may have failed.`;
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

    // Parse and validate the spec (V2 format uses task IDs)
    const specContent = readFileSync(specPath, 'utf-8');
    const taskMatches = specContent.match(/^###\s+T\d{3}:/gm);
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
      console.log(`Spec created at ${specPath} with ${taskCount} tasks\n`);
      console.log('Validation:');
      console.log(validationOutput);

      if (!completed) {
        console.log('\nWarning: AI did not output SPEC_COMPLETE marker.');
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
