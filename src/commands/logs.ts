import { getLogger } from '../lib/logging/logger.js';
import type { LogPhase } from '../lib/logging/logger.js';

export interface LogsOptions {
  cwd: string;
  phase?: LogPhase;
  since?: string;
  limit?: number;
  summary?: boolean;
}

export interface LogsResult {
  logs?: any[];
  summary?: {
    total_research_sessions: number;
    total_specs_generated: number;
    total_iterations: number;
    skills_fetched: { [key: string]: number };
    total_tokens: number;
  };
}

/**
 * Query and display logs
 */
export function runLogs(options: LogsOptions): LogsResult {
  const logger = getLogger(options.cwd);

  if (options.summary) {
    return {
      summary: logger.summary(),
    };
  }

  const filters: {
    phase?: LogPhase;
    since?: Date;
    limit?: number;
  } = {
    phase: options.phase,
    limit: options.limit,
  };

  if (options.since) {
    filters.since = new Date(options.since);
  }

  const logs = logger.query(filters);

  return { logs };
}

/**
 * Format logs for display
 */
export function formatLogs(result: LogsResult): string {
  if (result.summary) {
    const s = result.summary;
    return `
Ralphie Logs Summary
${'='.repeat(50)}

Research Sessions: ${s.total_research_sessions}
Specs Generated: ${s.total_specs_generated}
Iterations Run: ${s.total_iterations}
Total Tokens Used: ${s.total_tokens.toLocaleString()}

${Object.keys(s.skills_fetched).length > 0 ? `Skills Fetched:\n${Object.entries(s.skills_fetched)
  .sort(([, a], [, b]) => b - a)
  .map(([name, count]) => `  - ${name}: ${count}`)
  .join('\n')}` : 'No skills fetched yet'}
`.trim();
  }

  if (!result.logs || result.logs.length === 0) {
    return 'No logs found';
  }

  const output: string[] = [];

  for (const log of result.logs) {
    const timestamp = new Date(log.timestamp).toLocaleString();
    output.push(`\n[${log.phase}] ${log.type} - ${timestamp}`);
    output.push('-'.repeat(50));

    if (log.phase === 'research') {
      output.push(`Duration: ${log.duration_ms}ms`);
      if (log.agents) {
        output.push('\nAgents:');
        for (const [name, info] of Object.entries(log.agents as Record<string, any>)) {
          output.push(`  - ${name}: ${info.status} (${info.duration_ms || 0}ms)`);
          if (info.error) {
            output.push(`    Error: ${info.error}`);
          }
        }
      }
      if (log.skills_fetched && log.skills_fetched.length > 0) {
        output.push('\nSkills Fetched:');
        for (const skill of log.skills_fetched) {
          output.push(`  - ${skill.name} (${skill.installs} installs)`);
        }
      }
      if (log.output_saved) {
        output.push(`\nOutput: ${log.output_saved}`);
      }
    } else if (log.phase === 'spec') {
      output.push(`Duration: ${log.duration_ms}ms`);
      output.push(`\nInput:`);
      output.push(`  Description: ${log.input?.description || 'N/A'}`);
      output.push(`  Research available: ${log.input?.research_available ? 'Yes' : 'No'}`);
      output.push(`\nOutput:`);
      output.push(`  Spec file: ${log.output?.spec_file || 'N/A'}`);
      output.push(`  Tasks created: ${log.output?.tasks_created || 0}`);
      if (log.quality_injections) {
        output.push(`\nQuality Injections:`);
        output.push(`  - Test requirements: ${log.quality_injections.test_requirements ? 'Yes' : 'No'}`);
        output.push(`  - Security considerations: ${log.quality_injections.security_considerations ? 'Yes' : 'No'}`);
        output.push(`  - Architecture boundaries: ${log.quality_injections.architecture_boundaries ? 'Yes' : 'No'}`);
      }
    } else if (log.phase === 'iteration') {
      output.push(`Iteration: #${log.iteration_number}`);
      output.push(`Duration: ${log.duration_ms}ms`);
      output.push(`\nTask:`);
      output.push(`  ID: ${log.task?.id || 'N/A'}`);
      output.push(`  Title: ${log.task?.title || 'N/A'}`);
      output.push(`  Status: ${log.task?.status_before || 'N/A'} → ${log.task?.status_after || 'N/A'}`);
      if (log.steps && log.steps.length > 0) {
        output.push(`\nSteps:`);
        for (const step of log.steps) {
          const details = Object.entries(step)
            .filter(([k]) => k !== 'action')
            .map(([k, v]) => `${k}=${v}`)
            .join(', ');
          output.push(`  - ${step.action}${details ? ` (${details})` : ''}`);
        }
      }
      if (log.commit_hash) {
        output.push(`\nCommit: ${log.commit_hash}`);
      }
    }
  }

  return output.join('\n');
}
