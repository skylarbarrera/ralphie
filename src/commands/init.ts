import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getTemplatesDir(): string {
  // From dist/cli.js, templates is at ../templates
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

export interface InitResult {
  created: string[];
  skipped: string[];
}

export function runInit(targetDir: string): InitResult {
  const templatesDir = getTemplatesDir();

  if (!existsSync(templatesDir)) {
    throw new Error(`Templates directory not found: ${templatesDir}`);
  }

  const created: string[] = [];
  const skipped: string[] = [];

  copyRecursive(templatesDir, targetDir, created, skipped);

  return { created, skipped };
}
