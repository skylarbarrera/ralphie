import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync, rmSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import {
  runUpgrade,
  detectVersion,
  getMigrationPath,
  getVersionName,
  CURRENT_VERSION,
  VERSION_DEFINITIONS,
} from '../src/commands/upgrade.js';

const TEST_DIR = './test-upgrade-temp';

describe('VERSION_DEFINITIONS', () => {
  it('has v1 defined', () => {
    const v1 = VERSION_DEFINITIONS.find((v) => v.version === 1);
    expect(v1).toBeDefined();
    expect(v1?.indicators).toContain('PRD.md');
    expect(v1?.indicators).toContain('progress.txt');
  });

  it('has v2 defined', () => {
    const v2 = VERSION_DEFINITIONS.find((v) => v.version === 2);
    expect(v2).toBeDefined();
    expect(v2?.indicators).toContain('SPEC.md');
    expect(v2?.indicators).toContain('STATE.txt');
  });

  it('CURRENT_VERSION matches latest definition', () => {
    const maxVersion = Math.max(...VERSION_DEFINITIONS.map((v) => v.version));
    expect(CURRENT_VERSION).toBe(maxVersion);
  });
});

describe('detectVersion', () => {
  beforeEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
  });

  it('returns null when no version indicators found', () => {
    const result = detectVersion(TEST_DIR);
    expect(result.detectedVersion).toBeNull();
    expect(result.foundIndicators).toEqual([]);
    expect(result.isLatest).toBe(false);
  });

  it('detects v1 from PRD.md', () => {
    writeFileSync(join(TEST_DIR, 'PRD.md'), '# PRD');
    const result = detectVersion(TEST_DIR);
    expect(result.detectedVersion).toBe(1);
    expect(result.foundIndicators).toContain('PRD.md');
    expect(result.isLatest).toBe(false);
  });

  it('detects v1 from PRD (no extension)', () => {
    writeFileSync(join(TEST_DIR, 'PRD'), '# PRD');
    const result = detectVersion(TEST_DIR);
    expect(result.detectedVersion).toBe(1);
    expect(result.foundIndicators).toContain('PRD');
  });

  it('detects v1 from progress.txt', () => {
    writeFileSync(join(TEST_DIR, 'progress.txt'), 'Progress');
    const result = detectVersion(TEST_DIR);
    expect(result.detectedVersion).toBe(1);
    expect(result.foundIndicators).toContain('progress.txt');
  });

  it('detects v2 from SPEC.md', () => {
    writeFileSync(join(TEST_DIR, 'SPEC.md'), '# SPEC');
    const result = detectVersion(TEST_DIR);
    expect(result.detectedVersion).toBe(2);
    expect(result.foundIndicators).toContain('SPEC.md');
    expect(result.isLatest).toBe(true);
  });

  it('detects v2 from STATE.txt', () => {
    writeFileSync(join(TEST_DIR, 'STATE.txt'), '# Progress Log');
    const result = detectVersion(TEST_DIR);
    expect(result.detectedVersion).toBe(2);
    expect(result.foundIndicators).toContain('STATE.txt');
  });

  it('does not detect version from .ai/ralph directory alone', () => {
    mkdirSync(join(TEST_DIR, '.ai', 'ralph'), { recursive: true });
    const result = detectVersion(TEST_DIR);
    expect(result.detectedVersion).toBeNull();
  });

  it('detects highest version when mixed indicators present', () => {
    writeFileSync(join(TEST_DIR, 'PRD.md'), '# PRD');
    writeFileSync(join(TEST_DIR, 'SPEC.md'), '# SPEC');
    const result = detectVersion(TEST_DIR);
    expect(result.detectedVersion).toBe(2);
    expect(result.foundIndicators).toContain('PRD.md');
    expect(result.foundIndicators).toContain('SPEC.md');
  });

  it('collects all found indicators', () => {
    writeFileSync(join(TEST_DIR, 'PRD.md'), '# PRD');
    writeFileSync(join(TEST_DIR, 'progress.txt'), 'Progress');
    const result = detectVersion(TEST_DIR);
    expect(result.foundIndicators).toContain('PRD.md');
    expect(result.foundIndicators).toContain('progress.txt');
  });
});

describe('getMigrationPath', () => {
  it('returns single step for v1 to v2', () => {
    const path = getMigrationPath(1, 2);
    expect(path).toEqual(['1->2']);
  });

  it('returns empty array when already at target', () => {
    const path = getMigrationPath(2, 2);
    expect(path).toEqual([]);
  });

  it('throws when no migration exists', () => {
    expect(() => getMigrationPath(1, 99)).toThrow('No migration path');
  });
});

describe('getVersionName', () => {
  it('returns name for v1', () => {
    expect(getVersionName(1)).toContain('v1');
  });

  it('returns name for v2', () => {
    expect(getVersionName(2)).toContain('v2');
  });

  it('returns fallback for unknown version', () => {
    expect(getVersionName(99)).toBe('v99');
  });
});

describe('runUpgrade', () => {
  beforeEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
  });

  it('throws when no version detected', () => {
    expect(() => runUpgrade(TEST_DIR)).toThrow('Could not detect project version');
  });

  it('throws when already at target version', () => {
    writeFileSync(join(TEST_DIR, 'SPEC.md'), '# SPEC');
    expect(() => runUpgrade(TEST_DIR)).toThrow('already at v2');
  });

  it('returns migration result with from/to versions', () => {
    writeFileSync(join(TEST_DIR, 'PRD.md'), '# PRD');
    const result = runUpgrade(TEST_DIR);
    expect(result.fromVersion).toBe(1);
    expect(result.toVersion).toBe(2);
  });

  describe('v1 to v2 migration', () => {
    it('renames PRD.md to SPEC.md', () => {
      const content = '# My Project PRD';
      writeFileSync(join(TEST_DIR, 'PRD.md'), content);

      const result = runUpgrade(TEST_DIR);

      expect(existsSync(join(TEST_DIR, 'PRD.md'))).toBe(false);
      expect(existsSync(join(TEST_DIR, 'SPEC.md'))).toBe(true);
      expect(readFileSync(join(TEST_DIR, 'SPEC.md'), 'utf-8')).toBe(content);
      expect(result.renamed).toContainEqual({ from: 'PRD.md', to: 'SPEC.md' });
    });

    it('renames PRD (no extension) to SPEC.md', () => {
      const content = '# My Project PRD';
      writeFileSync(join(TEST_DIR, 'PRD'), content);

      const result = runUpgrade(TEST_DIR);

      expect(existsSync(join(TEST_DIR, 'PRD'))).toBe(false);
      expect(existsSync(join(TEST_DIR, 'SPEC.md'))).toBe(true);
      expect(readFileSync(join(TEST_DIR, 'SPEC.md'), 'utf-8')).toBe(content);
      expect(result.renamed).toContainEqual({ from: 'PRD', to: 'SPEC.md' });
    });

    it('converts progress.txt to STATE.txt with header', () => {
      const content = 'Task 1 done\nTask 2 done';
      writeFileSync(join(TEST_DIR, 'progress.txt'), content);

      const result = runUpgrade(TEST_DIR);

      expect(existsSync(join(TEST_DIR, 'progress.txt.bak'))).toBe(true);
      expect(existsSync(join(TEST_DIR, 'STATE.txt'))).toBe(true);
      expect(readFileSync(join(TEST_DIR, 'STATE.txt'), 'utf-8')).toBe(
        `# Progress Log\n\n${content}`
      );
      expect(result.renamed).toContainEqual({ from: 'progress.txt', to: 'STATE.txt' });
    });

    it('creates STATE.txt if neither exists', () => {
      writeFileSync(join(TEST_DIR, 'PRD.md'), '# PRD');
      const result = runUpgrade(TEST_DIR);

      expect(existsSync(join(TEST_DIR, 'STATE.txt'))).toBe(true);
      expect(readFileSync(join(TEST_DIR, 'STATE.txt'), 'utf-8')).toBe('# Progress Log\n\n');
      expect(result.created).toContain('STATE.txt');
    });

    it('creates .ai/ralph/ directory', () => {
      writeFileSync(join(TEST_DIR, 'PRD.md'), '# PRD');
      const result = runUpgrade(TEST_DIR);

      expect(existsSync(join(TEST_DIR, '.ai', 'ralph'))).toBe(true);
      expect(result.created).toContain('.ai/ralph/');
    });

    it('creates .gitkeep in .ai/ralph/', () => {
      writeFileSync(join(TEST_DIR, 'PRD.md'), '# PRD');
      const result = runUpgrade(TEST_DIR);

      expect(existsSync(join(TEST_DIR, '.ai', 'ralph', '.gitkeep'))).toBe(true);
      expect(result.created).toContain('.ai/ralph/.gitkeep');
    });

    it('skips .claude/ralph.md if already v2 content', () => {
      writeFileSync(join(TEST_DIR, 'PRD.md'), '# PRD');
      mkdirSync(join(TEST_DIR, '.claude'), { recursive: true });
      writeFileSync(join(TEST_DIR, '.claude', 'ralph.md'), 'SPEC.md and STATE.txt patterns');

      const result = runUpgrade(TEST_DIR);

      expect(readFileSync(join(TEST_DIR, '.claude', 'ralph.md'), 'utf-8')).toBe('SPEC.md and STATE.txt patterns');
      expect(result.skipped).toContainEqual('.claude/ralph.md (already v2)');
    });

    it('updates .claude/ralph.md if it has old patterns', () => {
      writeFileSync(join(TEST_DIR, 'PRD.md'), '# PRD');
      mkdirSync(join(TEST_DIR, '.claude'), { recursive: true });
      writeFileSync(join(TEST_DIR, '.claude', 'ralph.md'), 'Read PRD and progress.txt');

      const result = runUpgrade(TEST_DIR);

      expect(result.renamed).toContainEqual({ from: '.claude/ralph.md (old)', to: '.claude/ralph.md (v2)' });
    });

    it('performs complete upgrade from v1 to v2', () => {
      writeFileSync(join(TEST_DIR, 'PRD.md'), '# Project\n\n## Tasks\n- [ ] Task 1');
      writeFileSync(join(TEST_DIR, 'progress.txt'), '2024-01-01: Started project');

      const result = runUpgrade(TEST_DIR);

      expect(existsSync(join(TEST_DIR, 'SPEC.md'))).toBe(true);
      expect(existsSync(join(TEST_DIR, 'STATE.txt'))).toBe(true);
      expect(existsSync(join(TEST_DIR, '.ai', 'ralph'))).toBe(true);
      expect(result.fromVersion).toBe(1);
      expect(result.toVersion).toBe(2);
      expect(result.renamed).toHaveLength(2);
      expect(result.warnings).toHaveLength(0);
    });
  });
});
