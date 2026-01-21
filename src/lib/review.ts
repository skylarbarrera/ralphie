import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import type { Harness } from './harness/types.js';
import type { ReviewResult, ReviewSummary, ReviewSeverity, ReviewFinding } from './types.js';
import { calculateCost, formatCost } from './cost-tracker.js';

/**
 * Review agent configuration
 */
export interface ReviewAgent {
  name: string;
  fileName: string;
  description: string;
  languages?: string[]; // If specified, only run for these languages
}

/**
 * Available review agents
 */
export const REVIEW_AGENTS: ReviewAgent[] = [
  {
    name: 'security-sentinel',
    fileName: 'security-sentinel.md',
    description: 'Security vulnerabilities and OWASP compliance',
  },
  {
    name: 'performance-oracle',
    fileName: 'performance-oracle.md',
    description: 'Performance issues, N+1 queries, caching',
  },
  {
    name: 'architecture-strategist',
    fileName: 'architecture-strategist.md',
    description: 'Design patterns and architectural boundaries',
  },
  {
    name: 'typescript-reviewer',
    fileName: 'typescript-reviewer.md',
    description: 'TypeScript type safety and module extraction',
    languages: ['typescript', 'ts', 'tsx'],
  },
  {
    name: 'python-reviewer',
    fileName: 'python-reviewer.md',
    description: 'Python type hints and pythonic patterns',
    languages: ['python', 'py'],
  },
];

/**
 * Detect the primary language(s) used in the project
 *
 * @param cwd - Current working directory
 * @returns Array of detected language identifiers
 */
export function detectLanguages(cwd: string): string[] {
  const languages = new Set<string>();

  // Check for TypeScript
  if (
    existsSync(join(cwd, 'tsconfig.json')) ||
    existsSync(join(cwd, 'package.json'))
  ) {
    languages.add('typescript');
    languages.add('ts');
    languages.add('tsx');
  }

  // Check for Python
  if (
    existsSync(join(cwd, 'pyproject.toml')) ||
    existsSync(join(cwd, 'setup.py')) ||
    existsSync(join(cwd, 'requirements.txt'))
  ) {
    languages.add('python');
    languages.add('py');
  }

  // If no specific language detected, return empty (will use all general agents)
  return Array.from(languages);
}

/**
 * Select review agents based on detected languages
 *
 * @param cwd - Current working directory
 * @returns Array of selected review agents
 */
export function selectReviewers(cwd: string): ReviewAgent[] {
  const detectedLanguages = detectLanguages(cwd);
  const selectedAgents: ReviewAgent[] = [];

  for (const agent of REVIEW_AGENTS) {
    if (!agent.languages) {
      // General agent - always include
      selectedAgents.push(agent);
    } else if (detectedLanguages.length === 0) {
      // No languages detected - include all agents
      selectedAgents.push(agent);
    } else {
      // Check if agent's languages match detected languages
      const hasMatch = agent.languages.some((lang) =>
        detectedLanguages.includes(lang)
      );
      if (hasMatch) {
        selectedAgents.push(agent);
      }
    }
  }

  return selectedAgents;
}

/**
 * Load a review agent prompt from the agents/ directory
 *
 * @param agentFileName - Agent file name (e.g., 'security-sentinel.md')
 * @param agentsDir - Optional override for agents directory
 * @returns The agent prompt content
 */
export function loadReviewPrompt(
  agentFileName: string,
  agentsDir?: string
): string {
  const baseDir = agentsDir || join(dirname(dirname(__dirname)), 'agents');
  const promptPath = join(baseDir, agentFileName);

  if (!existsSync(promptPath)) {
    throw new Error(`Review agent prompt not found: ${promptPath}`);
  }

  return readFileSync(promptPath, 'utf-8');
}

/**
 * Parse severity from finding text
 *
 * @param text - Finding text that may contain severity markers
 * @returns Parsed severity level
 */
export function parseSeverity(text: string): ReviewSeverity {
  const lower = text.toLowerCase();

  if (lower.includes('critical') || lower.includes('🔴')) {
    return 'Critical';
  }
  if (lower.includes('high') || lower.includes('🟠')) {
    return 'High';
  }
  if (lower.includes('medium') || lower.includes('🟡')) {
    return 'Medium';
  }
  return 'Low';
}

/**
 * Parse findings from review output
 *
 * Looks for markdown sections with severity indicators
 *
 * @param output - The review output text
 * @returns Array of parsed findings
 */
export function parseFindings(output: string): ReviewFinding[] {
  const findings: ReviewFinding[] = [];

  // Look for patterns like:
  // ### Location
  // - **[File:Line]**: Description
  //   - Severity: High
  //   - Risk: ...
  //   - Fix: ...

  const sections = output.split(/###\s+/);

  for (const section of sections) {
    const lines = section.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Look for findings that start with - **[
      if (line.startsWith('- **[') || line.startsWith('* **[')) {
        const locationMatch = line.match(/\*\*\[(.*?)\]\*\*:?\s*(.*)/);
        if (!locationMatch) continue;

        const location = locationMatch[1];
        let description = locationMatch[2];

        // Look ahead for Severity, Risk, Fix
        let severity: ReviewSeverity = 'Low';
        let risk = '';
        let fix = '';

        for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
          const nextLine = lines[j].trim();

          if (nextLine.startsWith('- Severity:') || nextLine.startsWith('* Severity:')) {
            const sevMatch = nextLine.match(/Severity:\s*(\w+)/i);
            if (sevMatch) {
              severity = parseSeverity(sevMatch[1]);
            }
          } else if (nextLine.startsWith('- Risk:') || nextLine.startsWith('* Risk:')) {
            risk = nextLine.replace(/^[-*]\s*Risk:\s*/i, '').trim();
          } else if (nextLine.startsWith('- Fix:') || nextLine.startsWith('* Fix:')) {
            fix = nextLine.replace(/^[-*]\s*Fix:\s*/i, '').trim();
          } else if (nextLine.startsWith('- **[') || nextLine.startsWith('* **[')) {
            // Hit next finding, stop looking
            break;
          }
        }

        findings.push({
          location,
          description,
          severity,
          risk: risk || undefined,
          fix: fix || undefined,
        });
      }
    }
  }

  return findings;
}

/**
 * Run a single review agent
 *
 * @param harness - The harness to use
 * @param agent - The review agent to run
 * @param cwd - Current working directory
 * @param model - Optional model override
 * @param agentsDir - Optional override for agents directory
 * @returns Review result
 */
export async function runReviewer(
  harness: Harness,
  agent: ReviewAgent,
  cwd: string,
  model?: string,
  agentsDir?: string
): Promise<ReviewResult> {
  const startTime = Date.now();

  try {
    console.log(`\n🔍 Running ${agent.name}: ${agent.description}`);

    const prompt = loadReviewPrompt(agent.fileName, agentsDir);

    const result = await harness.run(
      prompt,
      {
        cwd,
        interactive: false,
        model,
      },
      () => {} // No-op event handler
    );

    const durationMs = Date.now() - startTime;
    const output = result.output || '';

    // Parse findings
    const findings = parseFindings(output);

    // Calculate cost if not provided by harness
    let costUsd = result.costUsd;
    if (!costUsd && result.usage) {
      costUsd = calculateCost(
        result.usage.inputTokens,
        result.usage.outputTokens,
        model,
        cwd
      );
    }

    // Display summary
    if (result.usage) {
      const costDisplay = formatCost(
        result.usage.inputTokens,
        result.usage.outputTokens,
        costUsd || 0
      );
      console.log(`  ✓ ${agent.name} complete: ${costDisplay}`);
    } else {
      console.log(`  ✓ ${agent.name} complete`);
    }

    if (findings.length > 0) {
      console.log(`  Found ${findings.length} issue(s)`);
    }

    return {
      agent: agent.name,
      output,
      findings,
      costUsd,
      usage: result.usage,
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error(`  ✗ ${agent.name} failed: ${errorMessage}`);

    return {
      agent: agent.name,
      output: '',
      findings: [],
      durationMs,
      error: errorMessage,
    };
  }
}

/**
 * Run all selected review agents in parallel
 *
 * @param harness - The harness to use
 * @param cwd - Current working directory
 * @param model - Optional model override
 * @param agentsDir - Optional override for agents directory
 * @returns Review summary
 */
export async function runReview(
  harness: Harness,
  cwd: string = process.cwd(),
  model?: string,
  agentsDir?: string
): Promise<ReviewSummary> {
  console.log('Starting multi-agent review...\n');

  // Select reviewers based on project languages
  const reviewers = selectReviewers(cwd);

  console.log(`Selected ${reviewers.length} reviewer(s):`);
  for (const reviewer of reviewers) {
    console.log(`  - ${reviewer.name}: ${reviewer.description}`);
  }

  // Run all reviewers in parallel
  const results = await Promise.all(
    reviewers.map((agent) => runReviewer(harness, agent, cwd, model, agentsDir))
  );

  // Aggregate results
  const totalCostUsd = results.reduce((sum, r) => sum + (r.costUsd || 0), 0);
  const totalDurationMs = results.reduce((sum, r) => sum + r.durationMs, 0);
  const allFindings = results.flatMap((r) => r.findings);

  // Count findings by severity (P1 = Critical/High, P2 = Medium, P3 = Low)
  const p1Count = allFindings.filter(
    (f) => f.severity === 'Critical' || f.severity === 'High'
  ).length;
  const p2Count = allFindings.filter((f) => f.severity === 'Medium').length;
  const p3Count = allFindings.filter((f) => f.severity === 'Low').length;

  const summary: ReviewSummary = {
    results,
    totalCostUsd,
    totalDurationMs,
    totalFindings: allFindings.length,
    p1Count,
    p2Count,
    p3Count,
    hasP1Issues: p1Count > 0,
  };

  // Save results to .ralphie/review.md
  await saveReviewResults(summary, cwd);

  // Display summary
  console.log('\n' + '='.repeat(60));
  console.log('Review Summary');
  console.log('='.repeat(60));
  console.log(`Total findings: ${allFindings.length}`);
  console.log(`  P1 (Critical/High): ${p1Count}`);
  console.log(`  P2 (Medium): ${p2Count}`);
  console.log(`  P3 (Low): ${p3Count}`);

  if (totalCostUsd > 0) {
    console.log(`\nTotal cost: $${totalCostUsd.toFixed(4)}`);
  }
  console.log(`Duration: ${(totalDurationMs / 1000).toFixed(1)}s`);
  console.log('='.repeat(60) + '\n');

  return summary;
}

/**
 * Save review results to .ralphie/review.md
 *
 * @param summary - Review summary to save
 * @param cwd - Current working directory
 */
export async function saveReviewResults(
  summary: ReviewSummary,
  cwd: string
): Promise<void> {
  const outputPath = join(cwd, '.ralphie', 'review.md');
  const outputDir = dirname(outputPath);

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  let content = '# Multi-Agent Review Results\n\n';
  content += `Generated: ${new Date().toISOString()}\n\n`;

  content += '## Summary\n\n';
  content += `- **Total Findings**: ${summary.totalFindings}\n`;
  content += `- **P1 (Critical/High)**: ${summary.p1Count}\n`;
  content += `- **P2 (Medium)**: ${summary.p2Count}\n`;
  content += `- **P3 (Low)**: ${summary.p3Count}\n`;
  if (summary.totalCostUsd > 0) {
    content += `- **Total Cost**: $${summary.totalCostUsd.toFixed(4)}\n`;
  }
  content += `- **Duration**: ${(summary.totalDurationMs / 1000).toFixed(1)}s\n\n`;

  content += '---\n\n';

  for (const result of summary.results) {
    content += `## ${result.agent}\n\n`;

    if (result.error) {
      content += `**Error**: ${result.error}\n\n`;
      continue;
    }

    if (result.usage) {
      const costDisplay = formatCost(
        result.usage.inputTokens,
        result.usage.outputTokens,
        result.costUsd || 0
      );
      content += `**Usage**: ${costDisplay}\n\n`;
    }

    if (result.findings.length === 0) {
      content += 'No issues found.\n\n';
    } else {
      content += `**Findings** (${result.findings.length}):\n\n`;

      // Group findings by severity
      const bySeverity: Record<string, ReviewFinding[]> = {
        Critical: [],
        High: [],
        Medium: [],
        Low: [],
      };

      for (const finding of result.findings) {
        bySeverity[finding.severity].push(finding);
      }

      for (const severity of ['Critical', 'High', 'Medium', 'Low']) {
        const findings = bySeverity[severity];
        if (findings.length === 0) continue;

        content += `### ${severity}\n\n`;

        for (const finding of findings) {
          content += `- **[${finding.location}]**: ${finding.description}\n`;
          if (finding.risk) {
            content += `  - Risk: ${finding.risk}\n`;
          }
          if (finding.fix) {
            content += `  - Fix: ${finding.fix}\n`;
          }
          content += '\n';
        }
      }
    }

    content += '---\n\n';
  }

  // Append full outputs at the end
  content += '## Full Agent Outputs\n\n';

  for (const result of summary.results) {
    content += `### ${result.agent}\n\n`;
    content += '```\n';
    content += result.output || '(no output)';
    content += '\n```\n\n';
  }

  writeFileSync(outputPath, content, 'utf-8');
  console.log(`Review results saved to ${outputPath}`);
}
