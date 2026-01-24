import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  locateActiveSpec,
  hasActiveSpec,
  getSpecsDirectory,
  getActiveSpecsDirectory,
  getCompletedSpecsDirectory,
  getSpecTemplatesDirectory,
  getLessonsPath,
  SpecLocatorError,
} from '../src/lib/spec-locator.js';

describe('spec-locator', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `spec-locator-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('locateActiveSpec', () => {
    describe('new .ralphie/ structure', () => {
      it('finds single spec in .ralphie/specs/active/', () => {
        const activeDir = join(testDir, '.ralphie', 'specs', 'active');
        mkdirSync(activeDir, { recursive: true });
        writeFileSync(join(activeDir, 'my-feature.md'), '# My Feature');

        const result = locateActiveSpec(testDir);

        expect(result.path).toBe(join(activeDir, 'my-feature.md'));
      });

      it('throws MULTIPLE_SPECS error when multiple specs exist', () => {
        const activeDir = join(testDir, '.ralphie', 'specs', 'active');
        mkdirSync(activeDir, { recursive: true });
        writeFileSync(join(activeDir, 'spec-a.md'), '# A');
        writeFileSync(join(activeDir, 'spec-b.md'), '# B');

        expect(() => locateActiveSpec(testDir)).toThrow(SpecLocatorError);
        try {
          locateActiveSpec(testDir);
        } catch (e) {
          expect(e).toBeInstanceOf(SpecLocatorError);
          expect((e as SpecLocatorError).code).toBe('MULTIPLE_SPECS');
        }
      });

      it('ignores hidden files', () => {
        const activeDir = join(testDir, '.ralphie', 'specs', 'active');
        mkdirSync(activeDir, { recursive: true });
        writeFileSync(join(activeDir, '.gitkeep'), '');
        writeFileSync(join(activeDir, 'real-spec.md'), '# Real');

        const result = locateActiveSpec(testDir);
        expect(result.path).toContain('real-spec.md');
      });

      it('ignores non-md files', () => {
        const activeDir = join(testDir, '.ralphie', 'specs', 'active');
        mkdirSync(activeDir, { recursive: true });
        writeFileSync(join(activeDir, 'notes.txt'), 'notes');
        writeFileSync(join(activeDir, 'spec.md'), '# Spec');

        const result = locateActiveSpec(testDir);
        expect(result.path).toContain('spec.md');
      });
    });

    describe('old specs/ structure (backward compat)', () => {
      it('finds single spec in specs/active/', () => {
        const activeDir = join(testDir, 'specs', 'active');
        mkdirSync(activeDir, { recursive: true });
        writeFileSync(join(activeDir, 'my-feature.md'), '# My Feature');

        const result = locateActiveSpec(testDir);

        expect(result.path).toBe(join(activeDir, 'my-feature.md'));
      });

      it('throws MULTIPLE_SPECS error when multiple specs exist', () => {
        const activeDir = join(testDir, 'specs', 'active');
        mkdirSync(activeDir, { recursive: true });
        writeFileSync(join(activeDir, 'spec-a.md'), '# A');
        writeFileSync(join(activeDir, 'spec-b.md'), '# B');

        expect(() => locateActiveSpec(testDir)).toThrow(SpecLocatorError);
        try {
          locateActiveSpec(testDir);
        } catch (e) {
          expect(e).toBeInstanceOf(SpecLocatorError);
          expect((e as SpecLocatorError).code).toBe('MULTIPLE_SPECS');
        }
      });
    });

    it('throws NO_SPEC error when no spec exists', () => {
      expect(() => locateActiveSpec(testDir)).toThrow(SpecLocatorError);
      try {
        locateActiveSpec(testDir);
      } catch (e) {
        expect(e).toBeInstanceOf(SpecLocatorError);
        expect((e as SpecLocatorError).code).toBe('NO_SPEC');
      }
    });
  });

  describe('hasActiveSpec', () => {
    it('returns true when spec exists in new structure', () => {
      const activeDir = join(testDir, '.ralphie', 'specs', 'active');
      mkdirSync(activeDir, { recursive: true });
      writeFileSync(join(activeDir, 'spec.md'), '# Spec');

      expect(hasActiveSpec(testDir)).toBe(true);
    });

    it('returns true when spec exists in old structure', () => {
      const activeDir = join(testDir, 'specs', 'active');
      mkdirSync(activeDir, { recursive: true });
      writeFileSync(join(activeDir, 'spec.md'), '# Spec');

      expect(hasActiveSpec(testDir)).toBe(true);
    });

    it('returns false when no spec exists', () => {
      expect(hasActiveSpec(testDir)).toBe(false);
    });

    it('returns false when multiple specs exist', () => {
      const activeDir = join(testDir, '.ralphie', 'specs', 'active');
      mkdirSync(activeDir, { recursive: true });
      writeFileSync(join(activeDir, 'a.md'), '# A');
      writeFileSync(join(activeDir, 'b.md'), '# B');

      expect(hasActiveSpec(testDir)).toBe(false);
    });
  });

  describe('directory helpers', () => {
    describe('new structure', () => {
      beforeEach(() => {
        mkdirSync(join(testDir, '.ralphie'), { recursive: true });
      });

      it('getSpecsDirectory returns .ralphie/specs path', () => {
        expect(getSpecsDirectory(testDir)).toBe(join(testDir, '.ralphie', 'specs'));
      });

      it('getActiveSpecsDirectory returns .ralphie/specs/active path', () => {
        expect(getActiveSpecsDirectory(testDir)).toBe(join(testDir, '.ralphie', 'specs', 'active'));
      });

      it('getCompletedSpecsDirectory returns .ralphie/specs/completed path', () => {
        expect(getCompletedSpecsDirectory(testDir)).toBe(join(testDir, '.ralphie', 'specs', 'completed'));
      });

      it('getSpecTemplatesDirectory returns .ralphie/specs/templates path', () => {
        expect(getSpecTemplatesDirectory(testDir)).toBe(join(testDir, '.ralphie', 'specs', 'templates'));
      });

      it('getLessonsPath returns .ralphie/learnings path', () => {
        expect(getLessonsPath(testDir)).toBe(join(testDir, '.ralphie', 'learnings'));
      });
    });

    describe('old structure (backward compat)', () => {
      beforeEach(() => {
        mkdirSync(join(testDir, 'specs'), { recursive: true });
      });

      it('getSpecsDirectory returns specs path', () => {
        expect(getSpecsDirectory(testDir)).toBe(join(testDir, 'specs'));
      });

      it('getActiveSpecsDirectory returns specs/active path', () => {
        expect(getActiveSpecsDirectory(testDir)).toBe(join(testDir, 'specs', 'active'));
      });

      it('getCompletedSpecsDirectory returns specs/completed path', () => {
        expect(getCompletedSpecsDirectory(testDir)).toBe(join(testDir, 'specs', 'completed'));
      });

      it('getLessonsPath returns specs/lessons.md path', () => {
        expect(getLessonsPath(testDir)).toBe(join(testDir, 'specs', 'lessons.md'));
      });
    });
  });
});
