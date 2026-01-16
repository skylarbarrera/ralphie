/**
 * Centralized configuration constants for Ralphie.
 * Modify with caution as these affect performance and UX.
 */

/** Activity log retention limits */
export const ACTIVITY_LOG_LIMITS = {
  /** State machine keeps more history for analysis */
  MACHINE_BUFFER: 50,
  /** UI shows fewer items to reduce clutter */
  UI_DISPLAY: 20,
} as const;

/** Text truncation limits for display */
export const TRUNCATION_LIMITS = {
  /** Max chars for task text in UI */
  TASK_TEXT: 100,
  /** Max chars for tool names (e.g., file paths, commands) */
  TOOL_DISPLAY_NAME: 20,
  /** Max chars for error message previews */
  ERROR_PREVIEW: 100,
} as const;

/** Iteration control limits */
export const ITERATION_LIMITS = {
  /** Default max iterations for --all flag */
  MAX_ALL: 100,
  /** Iterations without progress before marking "stuck" */
  STUCK_THRESHOLD: 3,
} as const;

/** Timeout defaults in milliseconds */
export const TIMEOUT_DEFAULTS = {
  /** Idle timeout before killing hung process (2 min) */
  IDLE_MS: 120_000,
} as const;

/** Exit codes for headless mode (Unix conventions) */
export const EXIT_CODES = {
  /** All tasks completed successfully */
  COMPLETE: 0,
  /** No progress after threshold iterations */
  STUCK: 1,
  /** Reached max iteration limit */
  MAX_ITERATIONS: 2,
  /** Fatal error occurred */
  ERROR: 3,
} as const;

/** UI layout constants */
export const UI_LAYOUT = {
  /** Minimum width for iteration header/footer boxes */
  MIN_BOX_WIDTH: 50,
} as const;
