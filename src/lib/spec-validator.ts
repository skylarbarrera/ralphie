import { readFileSync, existsSync } from 'fs';
import { locateActiveSpec, SpecLocatorError } from './spec-locator.js';

export type ViolationType =
  | 'code_snippet'
  | 'file_line_reference'
  | 'shell_command'
  | 'technical_notes_section'
  | 'implementation_instruction';

export interface SpecViolation {
  type: ViolationType;
  line: number;
  content: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  violations: SpecViolation[];
  warnings: string[];
}

const CODE_FENCE_PATTERN = /^```/;
const FILE_LINE_PATTERN = /\b[\w/.-]+\.(ts|js|tsx|jsx|py|go|rs|java|rb|php|c|cpp|h|hpp):\d+/i;
const SHELL_COMMAND_PATTERN = /^\s*[-•]\s*(npm|npx|yarn|pnpm|git|docker|kubectl|curl|wget|bash|sh|cd|mkdir|rm|cp|mv|cat|grep|awk|sed)\s+/i;
const TECHNICAL_NOTES_PATTERN = /^#{1,4}\s*(Technical\s*Notes?|Implementation\s*Notes?|Fix\s*Approach|How\s*to\s*Fix)/i;
const IMPLEMENTATION_KEYWORDS = [
  /\buse\s+`[^`]+`\s+to\b/i,
  /\bremove\s+(the|this)\s+(early\s+)?return\b/i,
  /\badd\s+`[^`]+`\s+(flag|option|parameter)\b/i,
  /\bchange\s+line\s+\d+\b/i,
  /\breplace\s+`[^`]+`\s+with\s+`[^`]+`/i,
  /\b(at|on|in)\s+line\s+\d+\b/i,
];

export function validateSpecContent(content: string): ValidationResult {
  const violations: SpecViolation[] = [];
  const warnings: string[] = [];
  const lines = content.split('\n');

  let inCodeBlock = false;
  let codeBlockStart = 0;
  let codeBlockContent: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    if (CODE_FENCE_PATTERN.test(line)) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockStart = lineNum;
        codeBlockContent = [];
      } else {
        if (codeBlockContent.length >= 1 && !isExampleBlock(lines, codeBlockStart - 1)) {
          violations.push({
            type: 'code_snippet',
            line: codeBlockStart,
            content: codeBlockContent.slice(0, 3).join('\n') + (codeBlockContent.length > 3 ? '\n...' : ''),
            message: 'Code snippets belong in plan.md, not the spec. Describe WHAT to build, not HOW.',
          });
        }
        inCodeBlock = false;
        codeBlockContent = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    if (FILE_LINE_PATTERN.test(line)) {
      violations.push({
        type: 'file_line_reference',
        line: lineNum,
        content: line.trim(),
        message: 'File:line references are implementation details. Describe the requirement instead.',
      });
    }

    if (SHELL_COMMAND_PATTERN.test(line)) {
      violations.push({
        type: 'shell_command',
        line: lineNum,
        content: line.trim(),
        message: 'Shell commands are implementation details. Describe the outcome instead.',
      });
    }

    if (TECHNICAL_NOTES_PATTERN.test(line)) {
      violations.push({
        type: 'technical_notes_section',
        line: lineNum,
        content: line.trim(),
        message: '"Technical Notes" sections belong in plan.md. Specs describe requirements only.',
      });
    }

    for (const pattern of IMPLEMENTATION_KEYWORDS) {
      if (pattern.test(line)) {
        violations.push({
          type: 'implementation_instruction',
          line: lineNum,
          content: line.trim(),
          message: 'This looks like an implementation instruction. Describe the deliverable instead.',
        });
        break;
      }
    }
  }

  return {
    valid: violations.length === 0,
    violations,
    warnings,
  };
}

function isExampleBlock(lines: string[], startIndex: number): boolean {
  for (let i = startIndex; i >= Math.max(0, startIndex - 3); i--) {
    const line = lines[i].toLowerCase();
    if (
      /\bexample\b/.test(line) ||
      /^#+\s*(bad|good)\b/.test(line) ||
      /\b(bad|good)\s+example\b/.test(line)
    ) {
      return true;
    }
  }
  return false;
}

export function validateSpec(specPath: string): ValidationResult {
  if (!existsSync(specPath)) {
    return {
      valid: false,
      violations: [],
      warnings: [`Spec not found at ${specPath}`],
    };
  }

  const content = readFileSync(specPath, 'utf-8');
  return validateSpecContent(content);
}

export function validateSpecInDir(dir: string): ValidationResult {
  try {
    const located = locateActiveSpec(dir);
    return validateSpec(located.path);
  } catch (err) {
    if (err instanceof SpecLocatorError) {
      return {
        valid: false,
        violations: [],
        warnings: [err.message],
      };
    }
    return {
      valid: false,
      violations: [],
      warnings: ['No spec found. Create a spec in specs/active/ or run `ralphie spec "description"`.'],
    };
  }
}

export function formatViolation(v: SpecViolation): string {
  return `Line ${v.line}: [${v.type}]\n  ${v.content}\n  → ${v.message}`;
}

export function formatValidationResult(result: ValidationResult): string {
  if (result.valid && result.warnings.length === 0) {
    return '✓ Spec follows conventions';
  }

  const parts: string[] = [];

  if (result.warnings.length > 0) {
    parts.push('Warnings:');
    parts.push(...result.warnings.map((w) => `  ⚠ ${w}`));
  }

  if (result.violations.length > 0) {
    parts.push(`\nFound ${result.violations.length} violation(s):\n`);
    parts.push(...result.violations.map((v) => formatViolation(v)));
  }

  return parts.join('\n');
}
