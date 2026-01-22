import fs from 'fs';
import path from 'path';

export type LogPhase = 'research' | 'spec' | 'iteration' | 'review';
export type LogType = 'start' | 'progress' | 'complete' | 'error';

export interface LogEvent {
  phase: LogPhase;
  type: LogType;
  data: Record<string, any>;
  timestamp: Date;
}

export interface SkillFetchLog {
  name: string;
  source: string;
  installs: number;
  lines?: number;
  fetch_duration_ms?: number;
}

export interface ResearchCompleteLog {
  duration_ms: number;
  agents: {
    [key: string]: {
      status: 'success' | 'error';
      duration_ms?: number;
      error?: string;
    };
  };
  skills_fetched?: SkillFetchLog[];
  web_searches?: number;
  recommendations?: Array<{ library: string; reason: string }>;
  total_tokens?: number;
  output_saved?: string;
}

export interface SpecCompleteLog {
  duration_ms: number;
  input: {
    description: string;
    research_available: boolean;
    research_tokens?: number;
  };
  output: {
    spec_file: string;
    tasks_created: number;
    estimated_size?: string;
  };
  quality_injections?: {
    test_requirements: boolean;
    security_considerations: boolean;
    architecture_boundaries: boolean;
  };
  tokens_used?: number;
}

export interface IterationCompleteLog {
  duration_ms: number;
  iteration_number: number;
  task: {
    id: string;
    title: string;
    status_before: string;
    status_after: string;
  };
  steps?: Array<{ action: string; duration_ms?: number; [key: string]: any }>;
  validation?: {
    test_validator_ran: boolean;
    coverage?: number;
    passed: boolean;
  };
  tokens_used?: number;
  commit_hash?: string;
}

export class RalphieLogger {
  private logDir: string;
  private enabled: boolean;

  constructor(cwd: string = process.cwd(), enabled: boolean = true) {
    this.logDir = path.join(cwd, '.ralphie', 'logs');
    this.enabled = enabled;
  }

  /**
   * Log an event to disk
   */
  log(event: LogEvent): void {
    if (!this.enabled) return;

    try {
      // Ensure log directory exists
      const phaseDir = path.join(this.logDir, event.phase);
      fs.mkdirSync(phaseDir, { recursive: true });

      // Create timestamped filename
      const timestamp = event.timestamp.toISOString().replace(/[:.]/g, '-');
      const filename = path.join(phaseDir, `${timestamp}.json`);

      // Write log entry
      const logEntry = {
        timestamp: event.timestamp.toISOString(),
        phase: event.phase,
        type: event.type,
        ...event.data,
      };

      fs.writeFileSync(filename, JSON.stringify(logEntry, null, 2));
    } catch (error) {
      // Don't fail the operation if logging fails
      console.warn(`Failed to write log: ${error}`);
    }
  }

  /**
   * Query logs by filters
   */
  query(filters: {
    phase?: LogPhase;
    since?: Date;
    limit?: number;
  }): any[] {
    const logs: any[] = [];

    try {
      const phases = filters.phase ? [filters.phase] : ['research', 'spec', 'iteration', 'review'];

      for (const phase of phases) {
        const phaseDir = path.join(this.logDir, phase);
        if (!fs.existsSync(phaseDir)) continue;

        const files = fs.readdirSync(phaseDir)
          .filter(f => f.endsWith('.json'))
          .sort()
          .reverse(); // Most recent first

        for (const file of files) {
          const content = fs.readFileSync(path.join(phaseDir, file), 'utf-8');
          const log = JSON.parse(content);

          // Filter by date if specified
          if (filters.since && new Date(log.timestamp) < filters.since) {
            continue;
          }

          logs.push(log);

          // Apply limit
          if (filters.limit && logs.length >= filters.limit) {
            return logs;
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to query logs: ${error}`);
    }

    return logs;
  }

  /**
   * Get summary statistics
   */
  summary(): {
    total_research_sessions: number;
    total_specs_generated: number;
    total_iterations: number;
    skills_fetched: { [key: string]: number };
    total_tokens: number;
  } {
    const logs = this.query({});
    
    const summary = {
      total_research_sessions: 0,
      total_specs_generated: 0,
      total_iterations: 0,
      skills_fetched: {} as { [key: string]: number },
      total_tokens: 0,
    };

    for (const log of logs) {
      if (log.phase === 'research' && log.type === 'complete') {
        summary.total_research_sessions++;
        if (log.skills_fetched) {
          for (const skill of log.skills_fetched) {
            summary.skills_fetched[skill.name] = (summary.skills_fetched[skill.name] || 0) + 1;
          }
        }
        if (log.total_tokens) {
          summary.total_tokens += log.total_tokens;
        }
      } else if (log.phase === 'spec' && log.type === 'complete') {
        summary.total_specs_generated++;
        if (log.tokens_used) {
          summary.total_tokens += log.tokens_used;
        }
      } else if (log.phase === 'iteration' && log.type === 'complete') {
        summary.total_iterations++;
        if (log.tokens_used) {
          summary.total_tokens += log.tokens_used;
        }
      }
    }

    return summary;
  }
}

// Singleton instance
let globalLogger: RalphieLogger | null = null;

export function getLogger(cwd?: string, enabled?: boolean): RalphieLogger {
  if (!globalLogger) {
    globalLogger = new RalphieLogger(cwd, enabled);
  }
  return globalLogger;
}

export function resetLogger(): void {
  globalLogger = null;
}
