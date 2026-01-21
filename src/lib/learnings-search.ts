import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join, basename } from 'path';
import yaml from 'js-yaml';
import { getProjectLearningsDirectory, getGlobalLearningsDirectory } from './paths.js';

/**
 * YAML frontmatter structure for learning files
 */
export interface LearningMetadata {
  problem: string;
  symptoms?: string;
  'root-cause'?: string;
  solution: string;
  prevention?: string;
  tags?: string[];
}

/**
 * Parsed learning file with metadata and content
 */
export interface Learning {
  filename: string;
  title: string; // Derived from filename
  metadata: LearningMetadata;
  content: string; // Body after frontmatter
  source: 'project' | 'global';
}

/**
 * Extract keywords from task for matching
 */
export function extractKeywords(taskTitle: string, deliverables?: string): string[] {
  const text = `${taskTitle} ${deliverables || ''}`.toLowerCase();

  // Split on word boundaries, filter short words and common stopwords
  const stopwords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from']);
  const words = text
    .split(/\W+/)
    .filter(word => word.length > 2 && !stopwords.has(word));

  return [...new Set(words)]; // Deduplicate
}

/**
 * Parse YAML frontmatter from a markdown file
 */
export function parseFrontmatter(content: string): { metadata: LearningMetadata | null; body: string } {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { metadata: null, body: content };
  }

  try {
    const metadata = yaml.load(match[1]) as LearningMetadata;
    const body = match[2].trim();
    return { metadata, body };
  } catch (error) {
    // Invalid YAML, return content as-is
    return { metadata: null, body: content };
  }
}

/**
 * Recursively find all .md files in a directory
 */
function findMarkdownFiles(dir: string): string[] {
  if (!existsSync(dir)) {
    return [];
  }

  const files: string[] = [];

  try {
    const entries = readdirSync(dir);

    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        files.push(...findMarkdownFiles(fullPath));
      } else if (stat.isFile() && entry.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    // Directory doesn't exist or can't be read, return empty
    return [];
  }

  return files;
}

/**
 * Load and parse a learning file
 */
function loadLearning(filePath: string, source: 'project' | 'global'): Learning | null {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const { metadata, body } = parseFrontmatter(content);

    if (!metadata || !metadata.problem || !metadata.solution) {
      // Invalid learning file (missing required fields)
      return null;
    }

    const filename = basename(filePath, '.md');
    const title = filename
      .replace(/-/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase()); // Title case

    return {
      filename,
      title,
      metadata,
      content: body,
      source
    };
  } catch (error) {
    // File can't be read or parsed
    return null;
  }
}

/**
 * Check if a learning matches the search keywords
 */
function matchesKeywords(learning: Learning, keywords: string[]): boolean {
  if (keywords.length === 0) {
    return false;
  }

  const searchText = [
    learning.metadata.problem,
    learning.metadata['root-cause'] || '',
    learning.metadata.solution,
    ...(learning.metadata.tags || [])
  ].join(' ').toLowerCase();

  // Match if any keyword is found in the search text
  return keywords.some(keyword => searchText.includes(keyword));
}

/**
 * Search for relevant learnings based on task information
 *
 * @param taskTitle - The title of the current task
 * @param deliverables - Optional deliverables text for additional context
 * @param cwd - Current working directory (defaults to process.cwd())
 * @param globalLearningsDir - Optional override for global learnings directory (for testing)
 * @returns Array of matching learnings (project learnings first, then global)
 */
export function searchLearnings(
  taskTitle: string,
  deliverables?: string,
  cwd: string = process.cwd(),
  globalLearningsDir?: string
): Learning[] {
  const keywords = extractKeywords(taskTitle, deliverables);

  if (keywords.length === 0) {
    return [];
  }

  const results: Learning[] = [];
  const seenFilenames = new Set<string>(); // For deduplication

  // 1. Search project learnings first
  const projectDir = getProjectLearningsDirectory(cwd);
  const projectFiles = findMarkdownFiles(projectDir);

  for (const filePath of projectFiles) {
    const learning = loadLearning(filePath, 'project');
    if (learning && matchesKeywords(learning, keywords)) {
      results.push(learning);
      seenFilenames.add(learning.filename);
    }
  }

  // 2. Search global learnings second (skip duplicates)
  const globalDir = globalLearningsDir || getGlobalLearningsDirectory();
  const globalFiles = findMarkdownFiles(globalDir);

  for (const filePath of globalFiles) {
    const learning = loadLearning(filePath, 'global');
    if (learning && !seenFilenames.has(learning.filename) && matchesKeywords(learning, keywords)) {
      results.push(learning);
      seenFilenames.add(learning.filename);
    }
  }

  return results;
}

/**
 * Format learnings into markdown for injection into prompts
 */
export function formatLearningsForPrompt(learnings: Learning[]): string {
  if (learnings.length === 0) {
    return '';
  }

  const lines = ['## Relevant Learnings', ''];
  lines.push('The following learnings from past iterations may help with this task:');
  lines.push('');

  for (const learning of learnings) {
    lines.push(`### ${learning.title}`);
    lines.push(`- **Problem:** ${learning.metadata.problem}`);
    lines.push(`- **Solution:** ${learning.metadata.solution}`);

    if (learning.metadata.prevention) {
      lines.push(`- **Prevention:** ${learning.metadata.prevention}`);
    }

    if (learning.metadata.tags && learning.metadata.tags.length > 0) {
      lines.push(`- **Tags:** ${learning.metadata.tags.join(', ')}`);
    }

    lines.push(`- **Source:** ${learning.source === 'project' ? 'Project learnings' : 'Global learnings'}`);
    lines.push('');
  }

  return lines.join('\n');
}
