/**
 * Learnings manager - creates and manages learning files
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';
import { getProjectLearningsDirectory, getGlobalLearningsDirectory } from '../paths.js';
import type {
  LearningCategory,
  LearningScope,
  LearningMetadata,
  CreateLearningInput,
  CreateLearningResult,
} from './types.js';

/**
 * Slugify a title for use as a filename
 */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Detect category from problem description
 */
export function detectCategory(problem: string, tags?: string[]): LearningCategory {
  const text = `${problem} ${tags?.join(' ') || ''}`.toLowerCase();

  // Check for build-related keywords (most specific first)
  if (
    text.includes('build') ||
    text.includes('compile') ||
    text.includes('compilation') ||
    text.includes('typescript error') ||
    text.includes('type error')
  ) {
    return 'build-errors';
  }

  // Check for test-related keywords
  if (
    text.includes('test') ||
    text.includes('jest') ||
    text.includes('vitest') ||
    text.includes('spec')
  ) {
    return 'test-failures';
  }

  // Check for runtime keywords
  if (
    text.includes('runtime') ||
    text.includes('crash') ||
    text.includes('exception') ||
    text.includes('error at runtime') ||
    text.includes('uncaught')
  ) {
    return 'runtime-errors';
  }

  // Default to patterns (best practices, code patterns, etc.)
  return 'patterns';
}

/**
 * Decide whether a learning should be global or project-specific
 *
 * Rules:
 * - Build errors → global (reusable across projects)
 * - Test failures → depends on specificity
 * - Runtime errors → depends on specificity
 * - Patterns → depends on specificity
 */
export function decideLearningScope(
  category: LearningCategory,
  problem: string,
  tags?: string[]
): LearningScope {
  // Build errors are typically tooling-related and reusable
  if (category === 'build-errors') {
    return 'global';
  }

  // Check if the problem/tags mention project-specific things
  const text = `${problem} ${tags?.join(' ') || ''}`.toLowerCase();
  const projectSpecificKeywords = [
    'this project',
    'our codebase',
    'our app',
    'specific to',
    'custom',
    'internal',
  ];

  const isProjectSpecific = projectSpecificKeywords.some((keyword) => text.includes(keyword));

  return isProjectSpecific ? 'project' : 'global';
}

/**
 * Ensure learnings directory exists for a given category
 */
function ensureCategoryDirectory(baseDir: string, category: LearningCategory): string {
  const categoryDir = join(baseDir, category);

  if (!existsSync(categoryDir)) {
    mkdirSync(categoryDir, { recursive: true });
  }

  return categoryDir;
}

/**
 * Format learning as markdown with YAML frontmatter
 */
function formatLearningContent(metadata: LearningMetadata, body: string = ''): string {
  // Add date if not present
  const metadataWithDate = {
    ...metadata,
    date: metadata.date || new Date().toISOString().split('T')[0],
  };

  const frontmatter = yaml.dump(metadataWithDate, { lineWidth: -1 });

  return `---
${frontmatter}---

${body.trim()}
`.trim();
}

/**
 * Create a new learning file
 *
 * @param input - Learning input data
 * @param cwd - Current working directory (for project learnings)
 * @returns Result with path and scope
 */
export function createLearning(
  input: CreateLearningInput,
  cwd: string = process.cwd()
): CreateLearningResult {
  // Determine category
  const category = input.category || detectCategory(input.metadata.problem, input.metadata.tags);

  // Determine scope
  const scope =
    input.scope || decideLearningScope(category, input.metadata.problem, input.metadata.tags);

  // Get base directory
  const baseDir = scope === 'global' ? getGlobalLearningsDirectory() : getProjectLearningsDirectory(cwd);

  // Ensure category directory exists
  const categoryDir = ensureCategoryDirectory(baseDir, category);

  // Generate filename
  const slug = slugify(input.title);
  const filename = `${slug}.md`;
  const filepath = join(categoryDir, filename);

  // Add category to metadata
  const metadataWithCategory = {
    ...input.metadata,
    category,
  };

  // Format content
  const content = formatLearningContent(metadataWithCategory, input.content || '');

  // Write file
  writeFileSync(filepath, content, 'utf-8');

  return {
    path: filepath,
    scope,
    category,
  };
}

/**
 * Generate learning file content from task failure
 *
 * This is used by the iteration loop when a task goes from failed → passed
 */
export interface TaskFailureContext {
  taskId: string;
  taskTitle: string;
  errorMessage?: string;
  logs?: string;
}

export function generateLearningFromFailure(context: TaskFailureContext): CreateLearningInput {
  const { taskId, taskTitle, errorMessage, logs } = context;

  const metadata: LearningMetadata = {
    problem: `Task ${taskId} (${taskTitle}) failed initially`,
    symptoms: errorMessage || 'Task failed with errors',
    'root-cause': 'To be filled in by AI',
    solution: 'To be filled in by AI',
    prevention: 'To be filled in by AI',
    tags: [taskId.toLowerCase(), 'task-failure'],
  };

  const content = `## Context

Task: ${taskTitle}
Task ID: ${taskId}

${logs ? `## Error Logs\n\n\`\`\`\n${logs}\n\`\`\`` : ''}

## Resolution

[AI should fill this in with what fixed the issue]

## Test Added

[AI should describe the test that would catch this bug]

## Rule Suggestion

[AI should suggest a rule to add to .claude/ralphie.md to prevent this]
`;

  return {
    title: `${taskId.toLowerCase()}-${slugify(taskTitle)}`,
    metadata,
    content,
  };
}
