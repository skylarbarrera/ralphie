import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface TaskInfo {
  taskNumber: string;
  phaseNumber: number;
  phaseName: string;
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
  const phaseNames: Map<number, string> = new Map();

  // Parse phase headings: ## Phase 1: Setup & Foundation
  const phaseHeadingRegex = /^##\s*Phase\s*(\d+):\s*(.+)$/gm;
  let match;
  while ((match = phaseHeadingRegex.exec(content)) !== null) {
    const phaseNum = parseInt(match[1], 10);
    const phaseName = match[2].trim();
    phaseNames.set(phaseNum, phaseName);
  }

  // Parse summary table to get task order
  // | Phase 1 | 1.1, 1.2, 1.3, 1.4 | 4 |
  const tableRowRegex = /^\|\s*Phase\s*(\d+)\s*\|\s*([^|]+)\s*\|\s*\d+\s*\|/gm;
  while ((match = tableRowRegex.exec(content)) !== null) {
    const phaseNum = parseInt(match[1], 10);
    const taskList = match[2].trim();
    const phaseName = phaseNames.get(phaseNum) ?? `Phase ${phaseNum}`;

    // Parse task numbers: "1.1, 1.2, 1.3"
    const taskNumbers = taskList.split(',').map((t) => t.trim()).filter(Boolean);
    for (const taskNumber of taskNumbers) {
      tasks.push({
        taskNumber,
        phaseNumber: phaseNum,
        phaseName,
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
