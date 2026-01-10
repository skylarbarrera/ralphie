import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface TaskInfo {
  taskNumber: string;
  phaseNumber: number;
  phaseName: string;
  taskText: string;
}

export interface SpecStructure {
  totalIterations: number;
  tasks: TaskInfo[];
}

export function parseSpec(specPath: string): SpecStructure | null {
  if (!existsSync(specPath)) {
    return null;
  }

  const content = readFileSync(specPath, 'utf-8');
  return parseSpecContent(content);
}

export function parseSpecContent(content: string): SpecStructure | null {
  const tasks: TaskInfo[] = [];

  const lines = content.split('\n');

  let currentPhaseNumber = 0;
  let currentPhaseName = 'Tasks';
  let taskCounter = 0;

  for (const line of lines) {
    // Check for Phase headings: "## Phase 1: Name" or "## Phase 1 - Name"
    const phaseMatch = line.match(/^#{2,3}\s+Phase\s*(\d+)\s*[:\-]\s*(.+)$/i);
    if (phaseMatch) {
      currentPhaseNumber = parseInt(phaseMatch[1], 10);
      currentPhaseName = phaseMatch[2].trim();
      continue;
    }

    // Check for other section headings (## or ###) - use as phase name
    const sectionMatch = line.match(/^#{2,3}\s+(.+)$/);
    if (sectionMatch) {
      const sectionTitle = sectionMatch[1].trim();
      if (!sectionTitle.toLowerCase().includes('summary')) {
        currentPhaseNumber++;
        currentPhaseName = sectionTitle;
      }
      continue;
    }

    // Check for incomplete checkbox tasks: - [ ] task text
    const checkboxMatch = line.match(/^-\s*\[\s*\]\s+(.+)$/);
    if (checkboxMatch) {
      taskCounter++;
      const fullTaskText = checkboxMatch[1].trim();

      // Try to extract task number from text: "1.1 Create project" or "1.1: Create project"
      const taskNumMatch = fullTaskText.match(/^(\d+\.\d+)\s*:?\s*(.*)$/);
      let taskNumber: string;
      let taskText: string;

      if (taskNumMatch) {
        taskNumber = taskNumMatch[1];
        taskText = taskNumMatch[2] || fullTaskText;
      } else {
        taskNumber = `${currentPhaseNumber}.${taskCounter}`;
        taskText = fullTaskText;
      }

      tasks.push({
        taskNumber,
        phaseNumber: currentPhaseNumber,
        phaseName: currentPhaseName,
        taskText,
      });
    }
  }

  if (tasks.length === 0) {
    return null;
  }

  return {
    totalIterations: tasks.length,
    tasks,
  };
}

export function getTaskForIteration(spec: SpecStructure, iteration: number): TaskInfo | null {
  const index = iteration - 1;
  if (index < 0 || index >= spec.tasks.length) {
    return null;
  }
  return spec.tasks[index];
}

export function loadSpecFromDir(dir: string): SpecStructure | null {
  const specPath = join(dir, 'SPEC.md');
  return parseSpec(specPath);
}
