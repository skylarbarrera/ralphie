import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  detectStructure,
  getRalphieRoot,
  getSpecsDirectory,
  getActiveSpecsDirectory,
  getStatePath,
  getLlmsTxtPath,
  getProjectLearningsDirectory,
  checkForOldStructure,
  getMigrationMessage,
} from '../../src/lib/paths.js';

describe('paths', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `paths-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('detectStructure', () => {
    it('detects new .ralphie/ structure', () => {
      mkdirSync(join(testDir, '.ralphie'), { recursive: true });

      const result = detectStructure(testDir);

      expect(result.usesNewStructure).toBe(true);
      expect(result.usesOldStructure).toBe(false);
    });

    it('detects old specs/ structure', () => {
      mkdirSync(join(testDir, 'specs'), { recursive: true });

      const result = detectStructure(testDir);

      expect(result.usesNewStructure).toBe(false);
      expect(result.usesOldStructure).toBe(true);
    });

    it('prefers new structure when both exist', () => {
      mkdirSync(join(testDir, '.ralphie'), { recursive: true });
      mkdirSync(join(testDir, 'specs'), { recursive: true });

      const result = detectStructure(testDir);

      expect(result.usesNewStructure).toBe(true);
      expect(result.usesOldStructure).toBe(false);
    });

    it('detects neither structure', () => {
      const result = detectStructure(testDir);

      expect(result.usesNewStructure).toBe(false);
      expect(result.usesOldStructure).toBe(false);
    });
  });

  describe('getRalphieRoot', () => {
    it('returns .ralphie/ for new structure', () => {
      mkdirSync(join(testDir, '.ralphie'), { recursive: true });

      const root = getRalphieRoot(testDir);

      expect(root).toBe(join(testDir, '.ralphie'));
    });

    it('returns project root for old structure', () => {
      mkdirSync(join(testDir, 'specs'), { recursive: true });

      const root = getRalphieRoot(testDir);

      expect(root).toBe(testDir);
    });
  });

  describe('getSpecsDirectory', () => {
    it('returns .ralphie/specs for new structure', () => {
      mkdirSync(join(testDir, '.ralphie'), { recursive: true });

      const path = getSpecsDirectory(testDir);

      expect(path).toBe(join(testDir, '.ralphie', 'specs'));
    });

    it('returns specs for old structure', () => {
      mkdirSync(join(testDir, 'specs'), { recursive: true });

      const path = getSpecsDirectory(testDir);

      expect(path).toBe(join(testDir, 'specs'));
    });
  });

  describe('getActiveSpecsDirectory', () => {
    it('returns .ralphie/specs/active for new structure', () => {
      mkdirSync(join(testDir, '.ralphie'), { recursive: true });

      const path = getActiveSpecsDirectory(testDir);

      expect(path).toBe(join(testDir, '.ralphie', 'specs', 'active'));
    });

    it('returns specs/active for old structure', () => {
      mkdirSync(join(testDir, 'specs'), { recursive: true });

      const path = getActiveSpecsDirectory(testDir);

      expect(path).toBe(join(testDir, 'specs', 'active'));
    });
  });

  describe('getStatePath', () => {
    it('returns .ralphie/state.txt for new structure', () => {
      mkdirSync(join(testDir, '.ralphie'), { recursive: true });

      const path = getStatePath(testDir);

      expect(path).toBe(join(testDir, '.ralphie', 'state.txt'));
    });

    it('returns STATE.txt for old structure', () => {
      mkdirSync(join(testDir, 'specs'), { recursive: true });

      const path = getStatePath(testDir);

      expect(path).toBe(join(testDir, 'STATE.txt'));
    });
  });

  describe('getLlmsTxtPath', () => {
    it('returns .ralphie/llms.txt', () => {
      const path = getLlmsTxtPath(testDir);

      expect(path).toBe(join(testDir, '.ralphie', 'llms.txt'));
    });
  });

  describe('getProjectLearningsDirectory', () => {
    it('returns .ralphie/learnings', () => {
      const path = getProjectLearningsDirectory(testDir);

      expect(path).toBe(join(testDir, '.ralphie', 'learnings'));
    });
  });

  describe('checkForOldStructure', () => {
    it('returns true for old structure', () => {
      mkdirSync(join(testDir, 'specs'), { recursive: true });

      expect(checkForOldStructure(testDir)).toBe(true);
    });

    it('returns false for new structure', () => {
      mkdirSync(join(testDir, '.ralphie'), { recursive: true });

      expect(checkForOldStructure(testDir)).toBe(false);
    });

    it('returns false when both exist (new takes precedence)', () => {
      mkdirSync(join(testDir, '.ralphie'), { recursive: true });
      mkdirSync(join(testDir, 'specs'), { recursive: true });

      expect(checkForOldStructure(testDir)).toBe(false);
    });
  });

  describe('getMigrationMessage', () => {
    it('returns migration guidance message', () => {
      const message = getMigrationMessage();

      expect(message).toContain('Old project structure detected');
      expect(message).toContain('MIGRATION.md');
    });
  });
});
