import type {
  ToolStartEvent,
  ToolEndEvent,
  TextEvent,
  ResultEvent,
  ActivityItem,
  LastCommit,
} from './types.js';
import {
  type ToolCategory,
  getToolCategory,
  getCategoryVerb,
  getToolDisplayName,
} from './tool-categories.js';

export type Phase = 'idle' | 'reading' | 'editing' | 'running' | 'thinking' | 'done';

export type { ToolCategory } from './tool-categories.js';

export interface ActiveTool {
  id: string;
  name: string;
  category: ToolCategory;
  startTime: number;
  input: Record<string, unknown>;
}

export interface CompletedTool {
  id: string;
  name: string;
  category: ToolCategory;
  durationMs: number;
  isError: boolean;
  input: Record<string, unknown>;
  output?: string;
}

export interface ToolGroup {
  category: ToolCategory;
  tools: CompletedTool[];
  totalDurationMs: number;
}

export interface Stats {
  toolsStarted: number;
  toolsCompleted: number;
  toolsErrored: number;
  reads: number;
  writes: number;
  commands: number;
  metaOps: number;
}

export interface IterationState {
  iteration: number;
  totalIterations: number;
  phase: Phase;
  startTime: number;
  taskText: string | null;
  activeTools: Map<string, ActiveTool>;
  completedTools: CompletedTool[];
  toolGroups: ToolGroup[];
  stats: Stats;
  result: ResultEvent | null;
  activityLog: ActivityItem[];
  lastCommit: LastCommit | null;
}

function createInitialStats(): Stats {
  return {
    toolsStarted: 0,
    toolsCompleted: 0,
    toolsErrored: 0,
    reads: 0,
    writes: 0,
    commands: 0,
    metaOps: 0,
  };
}

function phaseFromCategory(category: ToolCategory): Phase {
  switch (category) {
    case 'read':
      return 'reading';
    case 'write':
      return 'editing';
    case 'command':
      return 'running';
    case 'meta':
      return 'thinking';
  }
}

const MAX_ACTIVITY_LOG_SIZE = 50;

export function isGitCommitCommand(command: string): boolean {
  const trimmed = command.trim();
  return /^git\s+commit(\s|$)/.test(trimmed);
}

export function parseGitCommitOutput(output: string): { hash: string; message: string } | null {
  const match = output.match(/^\[[\w/-]+\s+([a-f0-9]{7,40})\]\s+(.+)$/m);
  if (!match) return null;
  return {
    hash: match[1],
    message: match[2],
  };
}

export class StateMachine {
  private state: IterationState;

  constructor(iteration: number = 1, totalIterations: number = 1) {
    this.state = {
      iteration,
      totalIterations,
      phase: 'idle',
      startTime: Date.now(),
      taskText: null,
      activeTools: new Map(),
      completedTools: [],
      toolGroups: [],
      stats: createInitialStats(),
      result: null,
      activityLog: [],
      lastCommit: null,
    };
  }

  getState(): Readonly<IterationState> {
    return this.state;
  }

  getElapsedMs(): number {
    return Date.now() - this.state.startTime;
  }

  private addActivityItem(item: ActivityItem): void {
    this.state.activityLog.push(item);
    if (this.state.activityLog.length > MAX_ACTIVITY_LOG_SIZE) {
      this.state.activityLog.shift();
    }
  }

  handleText(event: TextEvent): void {
    const trimmedText = event.text.trim();
    if (this.state.taskText === null) {
      this.state.taskText = trimmedText.slice(0, 100);
    }
    if (trimmedText) {
      this.addActivityItem({
        type: 'thought',
        timestamp: Date.now(),
        text: trimmedText,
      });
    }
    if (this.state.phase === 'idle') {
      this.state.phase = 'thinking';
    }
  }

  handleToolStart(event: ToolStartEvent): void {
    const category = getToolCategory(event.toolName);
    const displayName = getToolDisplayName(event.toolName, event.input);
    const activeTool: ActiveTool = {
      id: event.toolUseId,
      name: event.toolName,
      category,
      startTime: Date.now(),
      input: event.input,
    };

    this.state.activeTools.set(event.toolUseId, activeTool);
    this.state.stats.toolsStarted++;
    this.state.phase = phaseFromCategory(category);

    this.addActivityItem({
      type: 'tool_start',
      timestamp: Date.now(),
      toolUseId: event.toolUseId,
      toolName: event.toolName,
      displayName,
    });
  }

  handleToolEnd(event: ToolEndEvent): void {
    const activeTool = this.state.activeTools.get(event.toolUseId);
    if (!activeTool) return;

    this.state.activeTools.delete(event.toolUseId);

    const durationMs = Date.now() - activeTool.startTime;
    const displayName = getToolDisplayName(activeTool.name, activeTool.input);
    const output = typeof event.content === 'string'
      ? event.content
      : event.content.map((c) => c.text ?? '').join('');

    const completedTool: CompletedTool = {
      id: activeTool.id,
      name: activeTool.name,
      category: activeTool.category,
      durationMs,
      isError: event.isError,
      input: activeTool.input,
      output,
    };

    this.state.completedTools.push(completedTool);
    this.state.stats.toolsCompleted++;

    if (event.isError) {
      this.state.stats.toolsErrored++;
    }

    switch (activeTool.category) {
      case 'read':
        this.state.stats.reads++;
        break;
      case 'write':
        this.state.stats.writes++;
        break;
      case 'command':
        this.state.stats.commands++;
        break;
      case 'meta':
        this.state.stats.metaOps++;
        break;
    }

    this.updateToolGroups(completedTool);
    this.updatePhaseAfterToolEnd();

    this.addActivityItem({
      type: 'tool_complete',
      timestamp: Date.now(),
      toolUseId: activeTool.id,
      toolName: activeTool.name,
      displayName,
      durationMs,
      isError: event.isError,
    });

    if (activeTool.name === 'Bash' && !event.isError) {
      const command = activeTool.input.command;
      if (typeof command === 'string' && isGitCommitCommand(command)) {
        const commit = parseGitCommitOutput(output);
        if (commit) {
          this.state.lastCommit = commit;
          this.addActivityItem({
            type: 'commit',
            timestamp: Date.now(),
            hash: commit.hash,
            message: commit.message,
          });
        }
      }
    }
  }

  handleResult(event: ResultEvent): void {
    this.state.result = event;
    this.state.phase = 'done';
  }

  private updateToolGroups(tool: CompletedTool): void {
    const lastGroup = this.state.toolGroups[this.state.toolGroups.length - 1];

    if (lastGroup && lastGroup.category === tool.category) {
      lastGroup.tools.push(tool);
      lastGroup.totalDurationMs += tool.durationMs;
    } else {
      this.state.toolGroups.push({
        category: tool.category,
        tools: [tool],
        totalDurationMs: tool.durationMs,
      });
    }
  }

  private updatePhaseAfterToolEnd(): void {
    if (this.state.activeTools.size === 0) {
      this.state.phase = 'thinking';
    } else {
      const activeCategories = new Set(
        Array.from(this.state.activeTools.values()).map((t) => t.category)
      );

      if (activeCategories.has('command')) {
        this.state.phase = 'running';
      } else if (activeCategories.has('write')) {
        this.state.phase = 'editing';
      } else if (activeCategories.has('read')) {
        this.state.phase = 'reading';
      } else {
        this.state.phase = 'thinking';
      }
    }
  }

  getActiveToolNames(): string[] {
    return Array.from(this.state.activeTools.values()).map((t) => t.name);
  }

  getActiveToolsByCategory(category: ToolCategory): ActiveTool[] {
    return Array.from(this.state.activeTools.values()).filter(
      (t) => t.category === category
    );
  }

  getCoalescedSummary(): string {
    const active = this.state.activeTools.size;
    const phase = this.state.phase;

    if (phase === 'done') {
      return `Done (${this.state.stats.toolsCompleted} tools)`;
    }

    if (active === 0) {
      return phase === 'idle' ? 'Waiting...' : 'Thinking...';
    }

    const byCategory = new Map<ToolCategory, string[]>();
    for (const tool of this.state.activeTools.values()) {
      const names = byCategory.get(tool.category) ?? [];
      names.push(getToolDisplayName(tool.name, tool.input));
      byCategory.set(tool.category, names);
    }

    const parts: string[] = [];
    for (const [category, names] of byCategory) {
      const verb = getCategoryVerb(category);
      if (names.length === 1) {
        parts.push(`${verb} ${names[0]}`);
      } else if (names.length <= 3) {
        parts.push(`${verb} ${names.join(', ')}`);
      } else {
        parts.push(`${verb} ${names.length} items`);
      }
    }

    return parts.join(' • ');
  }


  reset(iteration?: number, totalIterations?: number): void {
    this.state = {
      iteration: iteration ?? this.state.iteration,
      totalIterations: totalIterations ?? this.state.totalIterations,
      phase: 'idle',
      startTime: Date.now(),
      taskText: null,
      activeTools: new Map(),
      completedTools: [],
      toolGroups: [],
      stats: createInitialStats(),
      result: null,
      activityLog: [],
      lastCommit: null,
    };
  }
}

export function createStateMachine(
  iteration: number = 1,
  totalIterations: number = 1
): StateMachine {
  return new StateMachine(iteration, totalIterations);
}
