import { ChildProcess, SpawnOptions } from 'child_process';

/**
 * Context for running a skill with a harness.
 */
export interface SkillContext {
  /** The prompt to send to the skill */
  prompt: string;
  /** Working directory for the skill execution */
  cwd: string;
  /** Optional timeout in milliseconds */
  timeout?: number;
}

/**
 * Result from running a skill.
 */
export interface SkillResult {
  /** Whether the skill completed successfully */
  success: boolean;
  /** Output from the skill execution */
  output: string;
  /** Error message if execution failed */
  error?: string;
  /** Exit code from the process */
  exitCode?: number;
}

/**
 * Harness interface for AI coding assistants.
 *
 * A harness is an adapter that wraps a specific AI coding assistant
 * (e.g., Claude Code, Codex, OpenCode) and provides a unified interface
 * for Ralph to interact with it.
 *
 * This abstraction allows Ralph to support multiple harnesses in the future
 * while maintaining a consistent API.
 */
export interface Harness {
  /** Name of the harness (e.g., "claude-code", "codex") */
  name: string;

  /**
   * Run a skill with the given context.
   * This is used for autonomous operations like spec generation and review.
   */
  runSkill(context: SkillContext): Promise<SkillResult>;

  /**
   * Spawn the AI assistant process with given arguments.
   * This is used for interactive iterations with streaming output.
   */
  spawn(args: string[], options: SpawnOptions): ChildProcess;
}
