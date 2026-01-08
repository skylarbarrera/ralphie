import type { ToolStartEvent, ToolEndEvent, TextEvent, ResultEvent } from './types.js';

export type Phase = 'idle' | 'reading' | 'editing' | 'running' | 'thinking' | 'done';

export type ToolCategory = 'read' | 'write' | 'command' | 'meta';

const TOOL_CATEGORIES: Record<string, ToolCategory> = {
  Read: 'read',
  Grep: 'read',
  Glob: 'read',
  Edit: 'write',
  Write: 'write',
  NotebookEdit: 'write',
  Bash: 'command',
  TodoWrite: 'meta',
  Task: 'meta',
  WebFetch: 'read',
  WebSearch: 'read',
  LSP: 'read',
};

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

function getToolCategory(toolName: string): ToolCategory {
  return TOOL_CATEGORIES[toolName] ?? 'meta';
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
    };
  }

  getState(): Readonly<IterationState> {
    return this.state;
  }

  getElapsedMs(): number {
    return Date.now() - this.state.startTime;
  }

  handleText(event: TextEvent): void {
    if (this.state.taskText === null) {
      this.state.taskText = event.text.trim().slice(0, 100);
    }
    if (this.state.phase === 'idle') {
      this.state.phase = 'thinking';
    }
  }

  handleToolStart(event: ToolStartEvent): void {
    const category = getToolCategory(event.toolName);
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
  }

  handleToolEnd(event: ToolEndEvent): void {
    const activeTool = this.state.activeTools.get(event.toolUseId);
    if (!activeTool) return;

    this.state.activeTools.delete(event.toolUseId);

    const completedTool: CompletedTool = {
      id: activeTool.id,
      name: activeTool.name,
      category: activeTool.category,
      durationMs: Date.now() - activeTool.startTime,
      isError: event.isError,
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
      names.push(this.getToolDisplayName(tool));
      byCategory.set(tool.category, names);
    }

    const parts: string[] = [];
    for (const [category, names] of byCategory) {
      const verb = this.getCategoryVerb(category);
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

  private getToolDisplayName(tool: ActiveTool): string {
    const input = tool.input;
    if (tool.name === 'Read' && typeof input.file_path === 'string') {
      return input.file_path.split('/').pop() ?? tool.name;
    }
    if (tool.name === 'Edit' && typeof input.file_path === 'string') {
      return input.file_path.split('/').pop() ?? tool.name;
    }
    if (tool.name === 'Write' && typeof input.file_path === 'string') {
      return input.file_path.split('/').pop() ?? tool.name;
    }
    if (tool.name === 'Bash' && typeof input.command === 'string') {
      const cmd = input.command.split(' ')[0];
      return cmd.length > 20 ? cmd.slice(0, 20) + '...' : cmd;
    }
    if (tool.name === 'Glob' && typeof input.pattern === 'string') {
      return input.pattern;
    }
    if (tool.name === 'Grep' && typeof input.pattern === 'string') {
      return input.pattern.slice(0, 20);
    }
    return tool.name;
  }

  private getCategoryVerb(category: ToolCategory): string {
    switch (category) {
      case 'read':
        return 'Reading';
      case 'write':
        return 'Editing';
      case 'command':
        return 'Running';
      case 'meta':
        return 'Processing';
    }
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
    };
  }
}

export function createStateMachine(
  iteration: number = 1,
  totalIterations: number = 1
): StateMachine {
  return new StateMachine(iteration, totalIterations);
}
