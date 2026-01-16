import { existsSync, renameSync, mkdirSync, copyFileSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getTemplatesDir(): string {
  return join(__dirname, '..', '..', 'templates');
}

export const CURRENT_VERSION = 2;

export interface VersionInfo {
  version: number;
  name: string;
  indicators: string[];
}

export const VERSION_DEFINITIONS: VersionInfo[] = [
  {
    version: 1,
    name: 'v1 (PRD/progress.txt)',
    indicators: ['PRD.md', 'PRD', 'progress.txt'],
  },
  {
    version: 2,
    name: 'v2 (SPEC.md/STATE.txt)',
    indicators: ['SPEC.md', 'STATE.txt'],
  },
];

export interface DetectionResult {
  detectedVersion: number | null;
  foundIndicators: string[];
  isLatest: boolean;
  hasLegacyFiles: boolean;
  legacyFiles: string[];
}

export function detectVersion(targetDir: string): DetectionResult {
  const foundIndicators: string[] = [];
  const legacyFiles: string[] = [];
  let detectedVersion: number | null = null;

  for (const versionDef of [...VERSION_DEFINITIONS].reverse()) {
    const found = versionDef.indicators.filter((indicator) =>
      existsSync(join(targetDir, indicator))
    );

    if (found.length > 0) {
      if (detectedVersion === null || versionDef.version > detectedVersion) {
        detectedVersion = versionDef.version;
      }
      foundIndicators.push(...found);

      if (versionDef.version < CURRENT_VERSION) {
        legacyFiles.push(...found);
      }
    }
  }

  return {
    detectedVersion,
    foundIndicators: [...new Set(foundIndicators)],
    isLatest: detectedVersion === CURRENT_VERSION,
    hasLegacyFiles: legacyFiles.length > 0,
    legacyFiles: [...new Set(legacyFiles)],
  };
}

export interface MigrationResult {
  fromVersion: number;
  toVersion: number;
  renamed: Array<{ from: string; to: string }>;
  created: string[];
  skipped: string[];
  warnings: string[];
}

type MigrationFn = (targetDir: string, result: MigrationResult) => void;

const migrations: Record<string, MigrationFn> = {
  '1->2': migrateV1ToV2,
};

function migrateV1ToV2(targetDir: string, result: MigrationResult): void {
  const prdPath = join(targetDir, 'PRD.md');
  const prdAltPath = join(targetDir, 'PRD');
  const specPath = join(targetDir, 'SPEC.md');

  if (existsSync(prdPath)) {
    if (existsSync(specPath)) {
      result.warnings.push('Both PRD.md and SPEC.md exist - keeping both, please merge manually');
    } else {
      renameSync(prdPath, specPath);
      result.renamed.push({ from: 'PRD.md', to: 'SPEC.md' });
    }
  } else if (existsSync(prdAltPath)) {
    if (existsSync(specPath)) {
      result.warnings.push('Both PRD and SPEC.md exist - keeping both, please merge manually');
    } else {
      renameSync(prdAltPath, specPath);
      result.renamed.push({ from: 'PRD', to: 'SPEC.md' });
    }
  }

  const progressPath = join(targetDir, 'progress.txt');
  const statePath = join(targetDir, 'STATE.txt');

  if (existsSync(progressPath)) {
    if (existsSync(statePath)) {
      result.warnings.push('Both progress.txt and STATE.txt exist - keeping both, please merge manually');
    } else {
      const progressContent = readFileSync(progressPath, 'utf-8');
      const newContent = `# Progress Log\n\n${progressContent}`;
      writeFileSync(statePath, newContent, 'utf-8');
      renameSync(progressPath, join(targetDir, 'progress.txt.bak'));
      result.renamed.push({ from: 'progress.txt', to: 'STATE.txt' });
    }
  } else if (!existsSync(statePath)) {
    writeFileSync(statePath, '# Progress Log\n\n', 'utf-8');
    result.created.push('STATE.txt');
  }

  ensureV2Structure(targetDir, result);
}

function ensureV2Structure(targetDir: string, result: MigrationResult): void {
  const aiRalphieDir = join(targetDir, '.ai', 'ralphie');
  if (!existsSync(aiRalphieDir)) {
    mkdirSync(aiRalphieDir, { recursive: true });
    result.created.push('.ai/ralphie/');
  }

  const gitkeepPath = join(aiRalphieDir, '.gitkeep');
  if (!existsSync(gitkeepPath)) {
    writeFileSync(gitkeepPath, '', 'utf-8');
    result.created.push('.ai/ralphie/.gitkeep');
  }

  const claudeDir = join(targetDir, '.claude');
  if (!existsSync(claudeDir)) {
    mkdirSync(claudeDir, { recursive: true });
  }

  const ralphieMdDest = join(claudeDir, 'ralphie.md');
  const templatesDir = getTemplatesDir();
  const ralphieMdSrc = join(templatesDir, '.claude', 'ralphie.md');

  if (!existsSync(ralphieMdDest)) {
    if (existsSync(ralphieMdSrc)) {
      copyFileSync(ralphieMdSrc, ralphieMdDest);
      result.created.push('.claude/ralphie.md');
    }
  } else {
    const existingContent = readFileSync(ralphieMdDest, 'utf-8');
    const hasOldPatterns = /\bPRD\b/.test(existingContent) || /\bprogress\.txt\b/.test(existingContent);

    if (hasOldPatterns) {
      if (existsSync(ralphieMdSrc)) {
        copyFileSync(ralphieMdSrc, ralphieMdDest);
        result.renamed.push({ from: '.claude/ralphie.md (old)', to: '.claude/ralphie.md (v2)' });
      }
    } else {
      result.skipped.push('.claude/ralphie.md (already v2)');
    }
  }

  const claudeMdDest = join(claudeDir, 'CLAUDE.md');
  if (existsSync(claudeMdDest)) {
    const existingContent = readFileSync(claudeMdDest, 'utf-8');
    const hasOldPatterns = /\bPRD\b/.test(existingContent) || /\bprogress\.txt\b/.test(existingContent);
    if (hasOldPatterns) {
      result.warnings.push('.claude/CLAUDE.md contains old patterns (PRD/progress.txt) - update manually');
    }
  }
}

export function getMigrationPath(fromVersion: number, toVersion: number): string[] {
  const path: string[] = [];
  let current = fromVersion;

  while (current < toVersion) {
    const next = current + 1;
    const key = `${current}->${next}`;
    if (!migrations[key]) {
      throw new Error(`No migration path from v${current} to v${next}`);
    }
    path.push(key);
    current = next;
  }

  return path;
}

export function runUpgrade(targetDir: string, targetVersion: number = CURRENT_VERSION): MigrationResult {
  const detection = detectVersion(targetDir);

  if (detection.detectedVersion === null) {
    throw new Error('Could not detect project version. Is this a Ralphie project?');
  }

  if (detection.detectedVersion >= targetVersion) {
    throw new Error(
      `Project is already at v${detection.detectedVersion} (target: v${targetVersion})`
    );
  }

  const result: MigrationResult = {
    fromVersion: detection.detectedVersion,
    toVersion: targetVersion,
    renamed: [],
    created: [],
    skipped: [],
    warnings: [],
  };

  const migrationPath = getMigrationPath(detection.detectedVersion, targetVersion);

  for (const step of migrationPath) {
    const migrationFn = migrations[step];
    migrationFn(targetDir, result);
  }

  return result;
}

export function getVersionName(version: number): string {
  const def = VERSION_DEFINITIONS.find((v) => v.version === version);
  return def?.name ?? `v${version}`;
}

export interface UpgradeResult {
  renamed: Array<{ from: string; to: string }>;
  created: string[];
  skipped: string[];
  warnings: string[];
}

export function detectOldPattern(targetDir: string): { hasOldPattern: boolean; files: string[] } {
  const detection = detectVersion(targetDir);
  return {
    hasOldPattern: detection.detectedVersion !== null && detection.detectedVersion < CURRENT_VERSION,
    files: detection.foundIndicators,
  };
}
