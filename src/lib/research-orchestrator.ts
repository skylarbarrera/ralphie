import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import type { Harness } from './harness/types.js';
import { getLogger, type ResearchCompleteLog } from './logging/logger.js';

/**
 * Research result from running a research agent
 */
export interface ResearchResult {
  agentName: string;
  output: string;
  error?: string;
}

/**
 * Loads a research agent prompt from the agents/ directory
 *
 * @param agentName - Name of the agent file (without .md extension)
 * @param agentsDir - Optional override for agents directory (defaults to npm package agents/)
 * @returns The agent prompt content
 */
export function loadAgentPrompt(agentName: string, agentsDir?: string): string {
  const baseDir = agentsDir || join(dirname(dirname(__dirname)), 'agents');
  const promptPath = join(baseDir, `${agentName}.md`);

  if (!existsSync(promptPath)) {
    throw new Error(`Agent prompt not found: ${promptPath}`);
  }

  return readFileSync(promptPath, 'utf-8');
}

/**
 * Runs a research agent using the provided harness
 *
 * @param harness - The harness to use for running the agent
 * @param agentName - Name of the research agent (repo-research-analyst or best-practices-researcher)
 * @param context - Additional context to inject into the prompt (e.g., project description)
 * @param cwd - Current working directory
 * @param agentsDir - Optional override for agents directory (for testing)
 * @returns The research output
 */
// Default timeout for research agents (180 seconds - allows time for skills.sh + web search)
const RESEARCH_TIMEOUT_MS = 180_000;

/**
 * Creates a timeout promise that rejects after the specified time
 */
function createTimeout(ms: number, agentName: string): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Research agent '${agentName}' timed out after ${ms / 1000}s`)), ms);
  });
}

export async function runResearchAgent(
  harness: Harness,
  agentName: string,
  context: string,
  cwd: string,
  agentsDir?: string,
  timeoutMs: number = RESEARCH_TIMEOUT_MS
): Promise<ResearchResult> {
  // Track partial output for timeout cases
  let partialOutput = '';

  try {
    const agentPrompt = loadAgentPrompt(agentName, agentsDir);

    // Build the full prompt with context
    const fullPrompt = `${agentPrompt}

---

## Research Context

${context}

## Instructions

Please conduct research following the methodology described above and provide a comprehensive report in the specified output format. Keep research focused - you have limited time (${timeoutMs / 1000}s).`;

    // Event handler to capture partial output
    const onEvent = (event: { type: string; text?: string }) => {
      if (event.type === 'message' && event.text) {
        partialOutput += event.text;
      }
    };

    // Run the agent via harness with timeout
    const result = await Promise.race([
      harness.run(
        fullPrompt,
        {
          cwd,
          interactive: false,
        },
        onEvent
      ),
      createTimeout(timeoutMs, agentName)
    ]);

    return {
      agentName,
      output: result.output || partialOutput || '',
    };
  } catch (error) {
    // On timeout, return partial output if available
    return {
      agentName,
      output: partialOutput || '',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Orchestrates the research phase by running both research agents
 *
 * @param harness - The harness to use for running agents
 * @param projectDescription - Description of what the user wants to build
 * @param cwd - Current working directory (project root)
 * @param skipResearch - If true, skip research and return empty results
 * @param agentsDir - Optional override for agents directory (for testing)
 * @returns Combined research output
 */
export async function conductResearch(
  harness: Harness,
  projectDescription: string,
  cwd: string = process.cwd(),
  skipResearch: boolean = false,
  agentsDir?: string
): Promise<string> {
  if (skipResearch) {
    console.log('Skipping research phase (--skip-research flag)');
    return '';
  }

  console.log('Starting research phase...');
  const researchStartTime = Date.now();

  // Build context for research agents
  const context = `Project Directory: ${cwd}

Project Goal: ${projectDescription}

Please analyze the codebase and provide comprehensive research findings.`;

  // Run both research agents in parallel for faster research
  console.log('Running repository research analyst and best practices researcher in parallel...');
  const repoStartTime = Date.now();
  const bpStartTime = Date.now();

  const [repoResearch, bestPracticesResearch] = await Promise.all([
    runResearchAgent(harness, 'repo-research-analyst', context, cwd, agentsDir),
    runResearchAgent(harness, 'best-practices-researcher', context, cwd, agentsDir),
  ]);

  const repoDuration = Date.now() - repoStartTime;
  const bpDuration = Date.now() - bpStartTime;

  if (repoResearch.error) {
    console.error(`Repository research failed: ${repoResearch.error}`);
  }

  if (bestPracticesResearch.error) {
    console.error(`Best practices research failed: ${bestPracticesResearch.error}`);
  }

  // Combine research findings
  const combinedResearch = `# Research Phase Results

## Repository Analysis

${repoResearch.output || 'Research failed: ' + (repoResearch.error || 'Unknown error')}

---

## Best Practices Research

${bestPracticesResearch.output || 'Research failed: ' + (bestPracticesResearch.error || 'Unknown error')}`;

  // Save research output to .ralphie/research-context.md
  const outputPath = join(cwd, '.ralphie', 'research-context.md');
  const outputDir = dirname(outputPath);

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  writeFileSync(outputPath, combinedResearch, 'utf-8');
  console.log(`Research findings saved to ${outputPath}`);

  // Log research completion
  const researchDuration = Date.now() - researchStartTime;
  const logger = getLogger(cwd);

  const logData: ResearchCompleteLog = {
    duration_ms: researchDuration,
    agents: {
      'repo-research-analyst': {
        status: repoResearch.error ? 'error' : 'success',
        duration_ms: repoDuration,
        error: repoResearch.error,
      },
      'best-practices-researcher': {
        status: bestPracticesResearch.error ? 'error' : 'success',
        duration_ms: bpDuration,
        error: bestPracticesResearch.error,
      },
    },
    output_saved: outputPath,
  };

  logger.log({
    phase: 'research',
    type: 'complete',
    data: logData,
    timestamp: new Date(),
  });

  return combinedResearch;
}

/**
 * Loads research context from .ralphie/research-context.md if it exists
 *
 * @param cwd - Current working directory (project root)
 * @returns The research context content, or empty string if not found
 */
export function loadResearchContext(cwd: string = process.cwd()): string {
  const contextPath = join(cwd, '.ralphie', 'research-context.md');

  if (!existsSync(contextPath)) {
    return '';
  }

  return readFileSync(contextPath, 'utf-8');
}

/**
 * Injects research findings into the spec generation prompt
 *
 * @param basePrompt - The base spec generation prompt
 * @param researchContext - The research findings to inject
 * @returns The modified prompt with research context
 */
export function injectResearchContext(basePrompt: string, researchContext: string): string {
  if (!researchContext || researchContext.trim().length === 0) {
    return basePrompt;
  }

  // Inject research findings near the beginning of the prompt
  const injectionMarker = '## Research Findings\n\n';
  const injection = `${injectionMarker}${researchContext}\n\n---\n\n`;

  // Try to inject after any frontmatter or initial instructions
  // If the prompt has clear structure, inject strategically; otherwise prepend
  const lines = basePrompt.split('\n');
  const firstHeadingIndex = lines.findIndex(line => line.startsWith('#'));

  if (firstHeadingIndex !== -1 && firstHeadingIndex < 10) {
    // Insert after the first heading
    lines.splice(firstHeadingIndex + 1, 0, '', injection);
    return lines.join('\n');
  }

  // Otherwise, prepend to the prompt
  return injection + basePrompt;
}
