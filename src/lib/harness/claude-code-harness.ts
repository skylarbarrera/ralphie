import { spawn, ChildProcess, SpawnOptions } from 'child_process';
import { Harness, SkillContext, SkillResult } from './types.js';

/**
 * Claude Code harness implementation.
 *
 * This harness wraps the `claude` CLI from Claude Code and provides
 * a unified interface for Ralph to interact with it.
 */
export class ClaudeCodeHarness implements Harness {
  name = 'claude-code';

  /**
   * Run a skill with Claude Code.
   *
   * This spawns the claude CLI with the given prompt and waits for completion.
   * Used for autonomous operations like spec generation and review.
   */
  async runSkill(context: SkillContext): Promise<SkillResult> {
    return new Promise((resolve) => {
      const args = [
        '--dangerously-skip-permissions',
        '--output-format',
        'stream-json',
        '--verbose',
        '-p',
        context.prompt,
      ];

      const claudeProcess = spawn('claude', args, {
        cwd: context.cwd,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let output = '';
      let errorOutput = '';

      claudeProcess.stdout?.on('data', (chunk) => {
        output += chunk.toString();
      });

      claudeProcess.stderr?.on('data', (chunk) => {
        errorOutput += chunk.toString();
      });

      const timeoutId = context.timeout
        ? setTimeout(() => {
            claudeProcess.kill();
            resolve({
              success: false,
              output,
              error: `Timeout after ${context.timeout}ms`,
              exitCode: -1,
            });
          }, context.timeout)
        : null;

      claudeProcess.on('close', (code) => {
        if (timeoutId) clearTimeout(timeoutId);

        resolve({
          success: code === 0,
          output,
          error: errorOutput || undefined,
          exitCode: code ?? undefined,
        });
      });

      claudeProcess.on('error', (err) => {
        if (timeoutId) clearTimeout(timeoutId);

        resolve({
          success: false,
          output,
          error: err.message,
          exitCode: -1,
        });
      });
    });
  }

  /**
   * Spawn the claude CLI process with given arguments.
   *
   * This is used for interactive iterations with streaming output.
   * The caller is responsible for handling the child process lifecycle.
   */
  spawn(args: string[], options: SpawnOptions): ChildProcess {
    return spawn('claude', args, options);
  }
}
