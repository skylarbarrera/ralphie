import { readFileSync, writeFileSync, unlinkSync, existsSync, mkdirSync } from 'fs';
import { join, basename } from 'path';
import { getCompletedSpecsDirectory } from './spec-locator.js';

export interface ArchiveResult {
  originalPath: string;
  archivedPath: string;
  tasksUpdated: number;
}

export function archiveSpec(specPath: string, projectDir: string = process.cwd()): ArchiveResult {
  if (!existsSync(specPath)) {
    throw new Error(`Spec file not found: ${specPath}`);
  }

  let content = readFileSync(specPath, 'utf-8');

  const tasksUpdated = updateAllTaskStatuses(content);
  content = tasksUpdated.content;

  content = addCompletionTimestamp(content);

  const completedDir = getCompletedSpecsDirectory(projectDir);
  if (!existsSync(completedDir)) {
    mkdirSync(completedDir, { recursive: true });
  }

  const archivedPath = generateArchivedPath(specPath, completedDir);

  writeFileSync(archivedPath, content);

  if (specPath !== archivedPath && existsSync(specPath)) {
    unlinkSync(specPath);
  }

  return {
    originalPath: specPath,
    archivedPath,
    tasksUpdated: tasksUpdated.count,
  };
}

function updateAllTaskStatuses(content: string): { content: string; count: number } {
  let count = 0;

  const statusRegex = /^(-\s*Status:\s*)(pending|in_progress|failed)/gm;
  const updatedContent = content.replace(statusRegex, (match, prefix) => {
    count++;
    return `${prefix}passed`;
  });

  return { content: updatedContent, count };
}

function addCompletionTimestamp(content: string): string {
  const timestamp = new Date().toISOString();
  const completionLine = `\n\n---\n**Completed:** ${timestamp}\n`;

  if (content.includes('## Notes')) {
    return content.replace(
      /## Notes/,
      `## Completion\n\n**Archived:** ${timestamp}${completionLine}\n## Notes`
    );
  }

  return content + completionLine;
}

function generateArchivedPath(specPath: string, completedDir: string): string {
  const today = new Date().toISOString().split('T')[0];
  const originalName = basename(specPath, '.md');

  const cleanName = originalName
    .replace(/^\d{4}-\d{2}-\d{2}-/, '')
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .toLowerCase();

  return join(completedDir, `${today}-${cleanName}.md`);
}

export function generateArchiveFilename(specPath: string): string {
  const today = new Date().toISOString().split('T')[0];
  const originalName = basename(specPath, '.md');

  const cleanName = originalName
    .replace(/^\d{4}-\d{2}-\d{2}-/, '')
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .toLowerCase();

  return `${today}-${cleanName}.md`;
}
