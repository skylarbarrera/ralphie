/**
 * Types for learnings capture system
 */

/**
 * Learning category determines storage location and helps with classification
 */
export type LearningCategory = 'build-errors' | 'test-failures' | 'runtime-errors' | 'patterns';

/**
 * Scope determines where the learning is stored
 */
export type LearningScope = 'global' | 'project';

/**
 * Learning metadata structure (YAML frontmatter)
 */
export interface LearningMetadata {
  /** Description of the problem that occurred */
  problem: string;

  /** Observable symptoms of the problem */
  symptoms?: string;

  /** Root cause analysis */
  'root-cause'?: string;

  /** Solution that fixed the problem */
  solution: string;

  /** How to prevent this problem in the future */
  prevention?: string;

  /** Searchable tags for finding relevant learnings */
  tags?: string[];

  /** Category of the learning */
  category?: LearningCategory;

  /** When the learning was created */
  date?: string;
}

/**
 * Input for creating a new learning
 */
export interface CreateLearningInput {
  /** Title/filename for the learning (will be slugified) */
  title: string;

  /** Learning metadata */
  metadata: LearningMetadata;

  /** Body content (markdown) */
  content?: string;

  /** Category (if not specified, will be detected) */
  category?: LearningCategory;

  /** Scope (if not specified, will be decided automatically) */
  scope?: LearningScope;
}

/**
 * Result of creating a learning
 */
export interface CreateLearningResult {
  /** Path where the learning was saved */
  path: string;

  /** Scope where it was saved */
  scope: LearningScope;

  /** Category used */
  category: LearningCategory;
}
