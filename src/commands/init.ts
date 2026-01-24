import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getGlobalRalphieDirectory, getGlobalLearningsDirectory, getGlobalSettingsPath } from '../lib/paths.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getTemplatesDir(): string {
  // From dist/cli.js (bundled), templates is at ../templates
  return join(__dirname, '..', 'templates');
}

function copyRecursive(src: string, dest: string, created: string[], skipped: string[]): void {
  const entries = readdirSync(src);

  for (const entry of entries) {
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    const stat = statSync(srcPath);

    if (stat.isDirectory()) {
      if (!existsSync(destPath)) {
        mkdirSync(destPath, { recursive: true });
      }
      copyRecursive(srcPath, destPath, created, skipped);
    } else {
      if (existsSync(destPath)) {
        skipped.push(destPath);
      } else {
        mkdirSync(dirname(destPath), { recursive: true });
        copyFileSync(srcPath, destPath);
        created.push(destPath);
      }
    }
  }
}

/**
 * Initialize global ~/.ralphie/ directory if it doesn't exist
 */
function initGlobalDirectory(): { created: boolean; path: string } {
  const globalDir = getGlobalRalphieDirectory();

  if (existsSync(globalDir)) {
    return { created: false, path: globalDir };
  }

  // Create global directory structure
  mkdirSync(globalDir, { recursive: true });

  // Create learnings subdirectories
  const learningsDir = getGlobalLearningsDirectory();
  mkdirSync(join(learningsDir, 'build-errors'), { recursive: true });
  mkdirSync(join(learningsDir, 'test-failures'), { recursive: true });
  mkdirSync(join(learningsDir, 'runtime-errors'), { recursive: true });
  mkdirSync(join(learningsDir, 'patterns'), { recursive: true });

  // Create default settings.json
  const settingsPath = getGlobalSettingsPath();
  const defaultSettings = {
    version: '1.0.0',
    mcp: {
      context7: {
        enabled: false,
        apiKey: '',
      },
    },
  };
  writeFileSync(settingsPath, JSON.stringify(defaultSettings, null, 2));

  return { created: true, path: globalDir };
}

export interface InitResult {
  created: string[];
  skipped: string[];
  globalDirectory?: {
    created: boolean;
    path: string;
  };
}

export function runInit(targetDir: string): InitResult {
  const templatesDir = getTemplatesDir();

  if (!existsSync(templatesDir)) {
    throw new Error(`Templates directory not found: ${templatesDir}`);
  }

  const created: string[] = [];
  const skipped: string[] = [];

  copyRecursive(templatesDir, targetDir, created, skipped);

  // Initialize global directory
  const globalDirectory = initGlobalDirectory();

  return { created, skipped, globalDirectory };
}
