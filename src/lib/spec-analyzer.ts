import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import type { Harness } from './harness/types.js';

/**
 * Analysis result from running the spec-flow-analyzer agent
 */
export interface AnalysisResult {
  output: string;
  hasGaps: boolean;
  gapCount: number;
  error?: string;
}

/**
 * Loads the spec-flow-analyzer agent prompt from the agents/ directory
 *
 * @param agentsDir - Optional override for agents directory (defaults to npm package agents/)
 * @returns The agent prompt content
 */
export function loadAnalyzerPrompt(agentsDir?: string): string {
  const baseDir = agentsDir || join(dirname(dirname(__dirname)), 'agents');
  const promptPath = join(baseDir, 'spec-flow-analyzer.md');

  if (!existsSync(promptPath)) {
    throw new Error(`Analyzer prompt not found: ${promptPath}`);
  }

  return readFileSync(promptPath, 'utf-8');
}

/**
 * Runs the spec-flow-analyzer agent on a generated spec
 *
 * @param harness - The harness to use for running the agent
 * @param specPath - Path to the spec file to analyze
 * @param cwd - Current working directory
 * @param agentsDir - Optional override for agents directory (for testing)
 * @returns The analysis result
 */
export async function runAnalyzer(
  harness: Harness,
  specPath: string,
  cwd: string,
  agentsDir?: string
): Promise<AnalysisResult> {
  try {
    const analyzerPrompt = loadAnalyzerPrompt(agentsDir);

    // Read the spec content
    if (!existsSync(specPath)) {
      throw new Error(`Spec file not found: ${specPath}`);
    }
    const specContent = readFileSync(specPath, 'utf-8');

    // Build the full prompt with spec content
    const fullPrompt = `${analyzerPrompt}

---

## Spec to Analyze

${specContent}

## Instructions

Please analyze the spec above following the four-phase methodology:
1. Deep Flow Analysis
2. Permutation Discovery
3. Gap Identification
4. Question Formulation

Provide a comprehensive analysis in the output structure specified above. Pay special attention to Ralphie-specific considerations (task sizing, verify commands, edge cases, backward compatibility).`;

    // Run the analyzer via harness
    const result = await harness.run(
      fullPrompt,
      {
        cwd,
        interactive: false,
      },
      () => {} // No-op event handler for analysis phase
    );

    const output = result.output || '';

    // Parse the output to detect gaps
    // Look for gap indicators (❓) or "Missing Elements" sections
    const hasGaps = output.includes('❓') ||
                    output.includes('Missing Elements') ||
                    output.includes('Critical Questions');

    // Count gap indicators
    const gapMatches = output.match(/❓/g);
    const gapCount = gapMatches ? gapMatches.length : 0;

    return {
      output,
      hasGaps,
      gapCount,
    };
  } catch (error) {
    return {
      output: '',
      hasGaps: false,
      gapCount: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Runs refinement on a spec to address identified gaps
 *
 * @param harness - The harness to use for refinement
 * @param specPath - Path to the spec file to refine
 * @param analysisOutput - The analysis findings to address
 * @param cwd - Current working directory
 * @returns Success status
 */
export async function refineSpec(
  harness: Harness,
  specPath: string,
  analysisOutput: string,
  cwd: string
): Promise<boolean> {
  try {
    const specContent = readFileSync(specPath, 'utf-8');

    const refinePrompt = `# Spec Refinement Task

You are tasked with refining a spec based on gap analysis findings.

## Original Spec

${specContent}

## Gap Analysis Findings

${analysisOutput}

## Instructions

1. Read the original spec and the gap analysis findings
2. Update the spec to address the identified gaps:
   - Add missing deliverables for undefined behaviors
   - Clarify verify commands if they're vague
   - Add edge cases to task deliverables
   - Split oversized tasks if needed
   - Add missing error handling requirements
3. Preserve the spec format and task IDs
4. Focus on critical and important gaps (not nice-to-haves)
5. Output: REFINEMENT_COMPLETE when done

Update the spec at: ${specPath}`;

    const result = await harness.run(
      refinePrompt,
      {
        cwd,
        interactive: false,
      },
      () => {}
    );

    // Check if refinement completed successfully
    const completed = result.output?.includes('REFINEMENT_COMPLETE') ?? false;
    return result.success && completed;
  } catch (error) {
    console.error(`Refinement failed: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

/**
 * Orchestrates the spec analysis phase
 *
 * @param harness - The harness to use for running the analyzer
 * @param specPath - Path to the spec file to analyze
 * @param cwd - Current working directory (project root)
 * @param skipAnalyze - If true, skip analysis
 * @param autonomous - If true, run refinement when gaps found
 * @param agentsDir - Optional override for agents directory (for testing)
 * @returns The analysis result
 */
export async function analyzeSpec(
  harness: Harness,
  specPath: string,
  cwd: string = process.cwd(),
  skipAnalyze: boolean = false,
  autonomous: boolean = false,
  agentsDir?: string
): Promise<AnalysisResult | null> {
  if (skipAnalyze) {
    console.log('Skipping analysis phase (--skip-analyze flag)');
    return null;
  }

  console.log('Starting spec analysis phase...');

  // Run the analyzer
  const analysis = await runAnalyzer(harness, specPath, cwd, agentsDir);

  if (analysis.error) {
    console.error(`Spec analysis failed: ${analysis.error}`);
    console.warn('Continuing without analysis...\n');
    return analysis;
  }

  // Save analysis output to .ralphie/analysis.md
  const outputPath = join(cwd, '.ralphie', 'analysis.md');
  const outputDir = dirname(outputPath);

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  writeFileSync(outputPath, analysis.output, 'utf-8');
  console.log(`Analysis findings saved to ${outputPath}`);

  // Report findings
  if (analysis.hasGaps) {
    console.log(`Found ${analysis.gapCount} gap(s) in the spec`);

    // In autonomous mode, run refinement
    if (autonomous) {
      console.log('Running automatic refinement...');
      const refined = await refineSpec(harness, specPath, analysis.output, cwd);

      if (refined) {
        console.log('Spec refined successfully');
      } else {
        console.warn('Refinement did not complete successfully');
      }
    } else {
      console.log('Review the analysis and address gaps manually (interactive mode)');
    }
  } else {
    console.log('No significant gaps found in the spec');
  }

  return analysis;
}
