import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('skills structure', () => {
  const skillsDir = path.resolve(__dirname, '../../skills');
  const skillDirs = fs.readdirSync(skillsDir).filter((name) => {
    const fullPath = path.join(skillsDir, name);
    return fs.statSync(fullPath).isDirectory();
  });

  it('has at least 3 skills', () => {
    expect(skillDirs.length).toBeGreaterThanOrEqual(3);
  });

  skillDirs.forEach((skillName) => {
    describe(`${skillName} skill`, () => {
      const skillPath = path.join(skillsDir, skillName, 'SKILL.md');

      it('has SKILL.md file', () => {
        expect(fs.existsSync(skillPath)).toBe(true);
      });

      it('has valid frontmatter for add-skill', () => {
        const content = fs.readFileSync(skillPath, 'utf-8');
        const lines = content.split('\n');

        // Check for frontmatter delimiters
        expect(lines[0]).toBe('---');
        const endIndex = lines.slice(1).findIndex((line) => line === '---');
        expect(endIndex).toBeGreaterThan(-1);

        // Extract frontmatter
        const frontmatter = lines.slice(1, endIndex + 1).join('\n');

        // Check required fields
        expect(frontmatter).toMatch(/^name:\s+\S+/m);
        expect(frontmatter).toMatch(/^description:\s+.+/m);
        expect(frontmatter).toMatch(/^context:\s+(fork|global)/m);
        expect(frontmatter).toMatch(/^allowed-tools:\s+.+/m);
      });

      it('has skill content after frontmatter', () => {
        const content = fs.readFileSync(skillPath, 'utf-8');
        const lines = content.split('\n');
        const endIndex = lines.slice(1).findIndex((line) => line === '---');
        const contentAfterFrontmatter = lines.slice(endIndex + 2).join('\n').trim();

        expect(contentAfterFrontmatter.length).toBeGreaterThan(100);
      });
    });
  });
});
