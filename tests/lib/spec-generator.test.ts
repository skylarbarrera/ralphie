import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateSpec, type SpecGeneratorOptions } from '../../src/lib/spec-generator.js';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import { Writable, Readable } from 'stream';

vi.mock('child_process');
vi.mock('fs');

describe('spec-generator', () => {
  let mockProcess: EventEmitter & {
    stdin: Writable & { write: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn> };
    stdout: EventEmitter;
    stderr: EventEmitter;
    kill: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock process.stdin to return a proper readable stream
    // Add setRawMode if it doesn't exist (test environment)
    if (!(process.stdin as any).setRawMode) {
      (process.stdin as any).setRawMode = () => {};
    }
    vi.spyOn(process.stdin, 'setRawMode' as any).mockImplementation(() => {});
    vi.spyOn(process.stdin, 'resume').mockImplementation(() => process.stdin);
    vi.spyOn(process.stdin, 'pause').mockImplementation(() => process.stdin);
    vi.spyOn(process.stdin, 'pipe').mockImplementation(() => process.stdin as any);
    vi.spyOn(process.stdin, 'unpipe').mockImplementation(() => process.stdin);

    // Create proper writable stream for mock process stdin
    const mockProcessStdin = new Writable({
      write(chunk, encoding, callback) {
        callback();
      },
    });
    (mockProcessStdin as any).write = vi.fn((data, cb) => {
      if (typeof cb === 'function') cb();
      return true;
    });
    (mockProcessStdin as any).end = vi.fn();

    mockProcess = Object.assign(new EventEmitter(), {
      stdin: mockProcessStdin as any,
      stdout: new EventEmitter(),
      stderr: new EventEmitter(),
      kill: vi.fn(),
    });

    vi.mocked(spawn).mockReturnValue(mockProcess as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateSpec', () => {
    it('uses /create-spec skill in interactive mode', async () => {
      const options: SpecGeneratorOptions = {
        description: 'Build a REST API for user management',
        cwd: '/test/path',
        headless: false,
        timeoutMs: 5000,
      };

      // Don't await - we'll trigger close immediately
      const promise = generateSpec(options);

      // Wait a tick for spawn to be called
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(spawn).toHaveBeenCalledWith(
        'claude',
        expect.arrayContaining(['--dangerously-skip-permissions']),
        expect.objectContaining({
          cwd: '/test/path',
          stdio: ['pipe', 'inherit', 'inherit'],
        })
      );

      expect(mockProcess.stdin.write).toHaveBeenCalledWith(
        expect.stringContaining('/create-spec')
      );
      expect(mockProcess.stdin.write).toHaveBeenCalledWith(
        expect.stringContaining('Build a REST API for user management')
      );

      // Simulate SPEC.md not created (to resolve promise)
      mockProcess.emit('close', 1);

      await promise;
    });

    it('uses embedded prompt in headless mode', async () => {
      const options: SpecGeneratorOptions = {
        description: 'Build a CLI tool',
        cwd: '/test/path',
        headless: true,
        timeoutMs: 5000,
      };

      const promise = generateSpec(options);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(spawn).toHaveBeenCalledWith(
        'claude',
        expect.arrayContaining(['--output-format', 'stream-json']),
        expect.objectContaining({
          cwd: '/test/path',
          stdio: ['pipe', 'pipe', 'pipe'],
        })
      );

      // In headless mode, the prompt should NOT include /create-spec
      const spawnCall = vi.mocked(spawn).mock.calls[0];
      const args = spawnCall[1] as string[];
      const promptIndex = args.indexOf('-p');
      const prompt = args[promptIndex + 1];

      expect(prompt).not.toContain('/create-spec');
      expect(prompt).toContain('Build a CLI tool');

      mockProcess.emit('close', 1);
      await promise;
    });

    it('respects model option', async () => {
      const options: SpecGeneratorOptions = {
        description: 'Test',
        cwd: '/test',
        headless: false,
        timeoutMs: 5000,
        model: 'opus',
      };

      const promise = generateSpec(options);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(spawn).toHaveBeenCalledWith(
        'claude',
        expect.arrayContaining(['--model', 'opus']),
        expect.anything()
      );

      mockProcess.emit('close', 1);
      await promise;
    });
  });
});
