#!/usr/bin/env npx tsx
/**
 * Spec Generation Prompt Testing Framework
 *
 * Runs test cases through the spec generator and captures results for comparison.
 *
 * Usage:
 *   npx tsx .ai/prompt-tests/run-tests.ts --phase before
 *   npx tsx .ai/prompt-tests/run-tests.ts --phase after
 *   npx tsx .ai/prompt-tests/run-tests.ts --compare
 */

import { execSync, spawn } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, readdirSync } from 'fs';
import { join } from 'path';

interface TestCase {
  id: string;
  name: string;
  category: string;
  description: string;
  cwd: string;
  setup: string;
  expected: {
    min_tasks: number;
    max_tasks: number;
    must_contain: string[];
    must_not_contain: string[];
  };
}

interface TestResult {
  id: string;
  name: string;
  timestamp: string;
  duration_ms: number;
  success: boolean;
  spec_created: boolean;
  task_count: number;
  validation_passed: boolean;
  review_passed: boolean;
  has_completion_marker: boolean;
  spec_content: string | null;
  score: {
    structure: number;
    content: number;
    quality: number;
    total: number;
  };
  violations: string[];
  notes: string[];
}

interface TestSuite {
  phase: 'before' | 'after';
  timestamp: string;
  git_ref: string;
  results: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    avg_score: number;
    avg_duration_ms: number;
  };
}

const RESULTS_DIR = join(process.cwd(), '.ai/prompt-tests/results');
const TEST_CASES_PATH = join(process.cwd(), '.ai/prompt-tests/test-cases.json');

function loadTestCases(): TestCase[] {
  const data = JSON.parse(readFileSync(TEST_CASES_PATH, 'utf-8'));
  return data.test_cases;
}

function setupTestDir(testCase: TestCase): void {
  // Clean up if exists
  if (existsSync(testCase.cwd)) {
    rmSync(testCase.cwd, { recursive: true, force: true });
  }

  // Run setup command
  try {
    execSync(testCase.setup, { stdio: 'pipe' });
  } catch (err) {
    console.error(`Setup failed for ${testCase.id}:`, err);
  }
}

function scoreSpec(content: string, testCase: TestCase): { structure: number; content: number; quality: number; total: number; violations: string[] } {
  const violations: string[] = [];
  let structure = 0;
  let contentScore = 0;
  let quality = 0;

  // Structure checks
  if (content.includes('## Goal')) structure += 10;
  else violations.push('Missing ## Goal section');

  if (/### Phase \d/.test(content)) structure += 10;
  else violations.push('Missing phase organization');

  if (/^- \[ \]/m.test(content)) structure += 10;
  else violations.push('Tasks missing checkboxes');

  if (/\*\*Verify:\*\*/.test(content)) structure += 15;
  else violations.push('Tasks missing Verify sections');

  // Content checks
  const codeBlockMatches = content.match(/```[\s\S]*?```/g) || [];
  const nonVerifyCodeBlocks = codeBlockMatches.filter(block => {
    const beforeBlock = content.substring(0, content.indexOf(block));
    return !beforeBlock.includes('**Verify:**') || beforeBlock.lastIndexOf('**Verify:**') < beforeBlock.lastIndexOf('- [ ]');
  });
  if (nonVerifyCodeBlocks.length === 0) contentScore += 15;
  else violations.push(`Found ${nonVerifyCodeBlocks.length} code blocks outside Verify sections`);

  if (!/\w+\.(ts|js|py|go|rs):\d+/.test(content)) contentScore += 10;
  else violations.push('Contains file:line references');

  // Check for shell commands as task deliverables (not in Verify sections)
  const taskSections = content.split(/^- \[ \]/m);
  let hasShellInTasks = false;
  for (const section of taskSections) {
    const verifyIndex = section.indexOf('**Verify:**');
    const taskPart = verifyIndex > 0 ? section.substring(0, verifyIndex) : section;
    if (/^\s*-\s*(npm|yarn|git|docker|curl)\s+/m.test(taskPart)) {
      hasShellInTasks = true;
      break;
    }
  }
  if (!hasShellInTasks) contentScore += 10;
  else violations.push('Shell commands found in task deliverables');

  // Check for instruction-style sub-bullets
  const instructionPatterns = [
    /^\s*-\s+Use\s+`[^`]+`\s+to/m,
    /^\s*-\s+Change\s+line\s+\d+/m,
    /^\s*-\s+Replace\s+`[^`]+`\s+with/m,
    /^\s*-\s+Add\s+`[^`]+`\s+at/m,
  ];
  const hasInstructions = instructionPatterns.some(p => p.test(content));
  if (!hasInstructions) contentScore += 10;
  else violations.push('Sub-bullets contain instructions, not deliverables');

  // Quality checks
  const taskMatches = content.match(/^- \[ \]/gm) || [];
  const taskCount = taskMatches.length;
  if (taskCount >= testCase.expected.min_tasks && taskCount <= testCase.expected.max_tasks) {
    quality += 10;
  } else {
    violations.push(`Task count ${taskCount} outside expected range ${testCase.expected.min_tasks}-${testCase.expected.max_tasks}`);
  }

  // Check must_contain
  for (const term of testCase.expected.must_contain) {
    if (content.toLowerCase().includes(term.toLowerCase())) {
      quality += 2;
    } else {
      violations.push(`Missing expected term: ${term}`);
    }
  }

  // Check must_not_contain
  for (const term of testCase.expected.must_not_contain) {
    if (content.includes(term)) {
      violations.push(`Contains forbidden term: ${term}`);
      quality -= 5;
    }
  }

  quality = Math.max(0, quality);
  const total = structure + contentScore + quality;

  return { structure, content: contentScore, quality, total, violations };
}

async function runTestCase(testCase: TestCase): Promise<TestResult> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Running: ${testCase.name}`);
  console.log(`Description: ${testCase.description}`);
  console.log('='.repeat(60));

  const startTime = Date.now();
  const notes: string[] = [];

  // Setup test directory
  setupTestDir(testCase);
  notes.push(`Setup: ${testCase.cwd}`);

  // Run ralphie init --headless
  let success = false;
  let specContent: string | null = null;
  let taskCount = 0;
  let validationPassed = false;
  let reviewPassed = false;
  let hasCompletionMarker = false;

  try {
    const result = execSync(
      `ralphie spec --headless --cwd "${testCase.cwd}" "${testCase.description}"`,
      {
        cwd: testCase.cwd,
        timeout: 300000, // 5 min timeout
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, FORCE_COLOR: '0' },
      }
    );

    // Parse JSON output
    const lines = result.split('\n').filter(l => l.trim());
    for (const line of lines) {
      try {
        const event = JSON.parse(line);
        if (event.event === 'spec_generation_complete') {
          success = true;
          taskCount = event.taskCount || 0;
          validationPassed = event.validationPassed || false;
          reviewPassed = event.reviewPassed || false;
          hasCompletionMarker = event.hasCompletionMarker || false;
        }
      } catch {
        // Not JSON, skip
      }
    }

    // Read SPEC.md if it exists
    const specPath = join(testCase.cwd, 'SPEC.md');
    if (existsSync(specPath)) {
      specContent = readFileSync(specPath, 'utf-8');
      notes.push(`SPEC.md created: ${specContent.length} bytes`);
    } else {
      notes.push('SPEC.md NOT created');
    }
  } catch (err: any) {
    notes.push(`Error: ${err.message}`);

    // Still try to read SPEC.md
    const specPath = join(testCase.cwd, 'SPEC.md');
    if (existsSync(specPath)) {
      specContent = readFileSync(specPath, 'utf-8');
      notes.push(`SPEC.md exists despite error: ${specContent.length} bytes`);
    }
  }

  const duration_ms = Date.now() - startTime;

  // Score the spec
  let score = { structure: 0, content: 0, quality: 0, total: 0, violations: [] as string[] };
  if (specContent) {
    score = scoreSpec(specContent, testCase);
    taskCount = (specContent.match(/^- \[ \]/gm) || []).length;
  }

  const result: TestResult = {
    id: testCase.id,
    name: testCase.name,
    timestamp: new Date().toISOString(),
    duration_ms,
    success: success && score.total >= 50,
    spec_created: specContent !== null,
    task_count: taskCount,
    validation_passed: validationPassed,
    review_passed: reviewPassed,
    has_completion_marker: hasCompletionMarker,
    spec_content: specContent,
    score,
    violations: score.violations,
    notes,
  };

  console.log(`\nResult: ${result.success ? 'PASS' : 'FAIL'}`);
  console.log(`Score: ${score.total}/100 (structure: ${score.structure}, content: ${score.content}, quality: ${score.quality})`);
  console.log(`Tasks: ${taskCount}, Duration: ${duration_ms}ms`);
  if (score.violations.length > 0) {
    console.log(`Violations: ${score.violations.join(', ')}`);
  }

  return result;
}

async function runTestSuite(phase: 'before' | 'after'): Promise<TestSuite> {
  const testCases = loadTestCases();
  const results: TestResult[] = [];

  console.log(`\n${'#'.repeat(60)}`);
  console.log(`# Running ${phase.toUpperCase()} test suite`);
  console.log(`# ${testCases.length} test cases`);
  console.log('#'.repeat(60));

  for (const testCase of testCases) {
    const result = await runTestCase(testCase);
    results.push(result);
  }

  // Calculate summary
  const passed = results.filter(r => r.success).length;
  const avgScore = results.reduce((sum, r) => sum + r.score.total, 0) / results.length;
  const avgDuration = results.reduce((sum, r) => sum + r.duration_ms, 0) / results.length;

  const suite: TestSuite = {
    phase,
    timestamp: new Date().toISOString(),
    git_ref: execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim(),
    results,
    summary: {
      total: results.length,
      passed,
      failed: results.length - passed,
      avg_score: Math.round(avgScore * 10) / 10,
      avg_duration_ms: Math.round(avgDuration),
    },
  };

  // Save results
  if (!existsSync(RESULTS_DIR)) {
    mkdirSync(RESULTS_DIR, { recursive: true });
  }
  const outputPath = join(RESULTS_DIR, `${phase}-${Date.now()}.json`);
  writeFileSync(outputPath, JSON.stringify(suite, null, 2));
  console.log(`\nResults saved to: ${outputPath}`);

  // Print summary
  console.log(`\n${'='.repeat(60)}`);
  console.log(`SUMMARY: ${phase.toUpperCase()}`);
  console.log('='.repeat(60));
  console.log(`Total: ${suite.summary.total}`);
  console.log(`Passed: ${suite.summary.passed}`);
  console.log(`Failed: ${suite.summary.failed}`);
  console.log(`Avg Score: ${suite.summary.avg_score}/100`);
  console.log(`Avg Duration: ${suite.summary.avg_duration_ms}ms`);

  return suite;
}

function compareResults(): void {
  if (!existsSync(RESULTS_DIR)) {
    console.error('No results directory found. Run tests first.');
    process.exit(1);
  }

  const files = readdirSync(RESULTS_DIR) as string[];
  const beforeFiles = files.filter((f: string) => f.startsWith('before-')).sort();
  const afterFiles = files.filter((f: string) => f.startsWith('after-')).sort();

  if (beforeFiles.length === 0 || afterFiles.length === 0) {
    console.error('Need both before and after results. Run:');
    console.error('  npx tsx .ai/prompt-tests/run-tests.ts --phase before');
    console.error('  npx tsx .ai/prompt-tests/run-tests.ts --phase after');
    process.exit(1);
  }

  // Load latest results
  const beforeSuite: TestSuite = JSON.parse(
    readFileSync(join(RESULTS_DIR, beforeFiles[beforeFiles.length - 1]), 'utf-8')
  );
  const afterSuite: TestSuite = JSON.parse(
    readFileSync(join(RESULTS_DIR, afterFiles[afterFiles.length - 1]), 'utf-8')
  );

  console.log('\n' + '='.repeat(70));
  console.log('BEFORE vs AFTER COMPARISON');
  console.log('='.repeat(70));

  console.log(`\nBEFORE: ${beforeSuite.timestamp} (${beforeSuite.git_ref.substring(0, 8)})`);
  console.log(`AFTER:  ${afterSuite.timestamp} (${afterSuite.git_ref.substring(0, 8)})`);

  console.log('\n' + '-'.repeat(70));
  console.log('SUMMARY COMPARISON');
  console.log('-'.repeat(70));

  const metrics = [
    ['Passed', beforeSuite.summary.passed, afterSuite.summary.passed],
    ['Failed', beforeSuite.summary.failed, afterSuite.summary.failed],
    ['Avg Score', beforeSuite.summary.avg_score, afterSuite.summary.avg_score],
    ['Avg Duration (ms)', beforeSuite.summary.avg_duration_ms, afterSuite.summary.avg_duration_ms],
  ];

  console.log('Metric'.padEnd(25) + 'BEFORE'.padStart(12) + 'AFTER'.padStart(12) + 'DELTA'.padStart(12));
  for (const [name, before, after] of metrics) {
    const delta = (after as number) - (before as number);
    const deltaStr = delta >= 0 ? `+${delta}` : `${delta}`;
    console.log(
      (name as string).padEnd(25) +
      String(before).padStart(12) +
      String(after).padStart(12) +
      deltaStr.padStart(12)
    );
  }

  console.log('\n' + '-'.repeat(70));
  console.log('PER-TEST COMPARISON');
  console.log('-'.repeat(70));

  console.log('Test'.padEnd(35) + 'BEFORE'.padStart(10) + 'AFTER'.padStart(10) + 'DELTA'.padStart(10));

  for (const afterResult of afterSuite.results) {
    const beforeResult = beforeSuite.results.find(r => r.id === afterResult.id);
    if (beforeResult) {
      const delta = afterResult.score.total - beforeResult.score.total;
      const deltaStr = delta >= 0 ? `+${delta}` : `${delta}`;
      const indicator = delta > 0 ? '✓' : delta < 0 ? '✗' : '=';
      console.log(
        afterResult.name.substring(0, 33).padEnd(35) +
        String(beforeResult.score.total).padStart(10) +
        String(afterResult.score.total).padStart(10) +
        `${deltaStr} ${indicator}`.padStart(10)
      );
    }
  }

  // Save comparison report
  const report = {
    timestamp: new Date().toISOString(),
    before: {
      timestamp: beforeSuite.timestamp,
      git_ref: beforeSuite.git_ref,
      summary: beforeSuite.summary,
    },
    after: {
      timestamp: afterSuite.timestamp,
      git_ref: afterSuite.git_ref,
      summary: afterSuite.summary,
    },
    improvement: {
      passed_delta: afterSuite.summary.passed - beforeSuite.summary.passed,
      score_delta: afterSuite.summary.avg_score - beforeSuite.summary.avg_score,
      duration_delta: afterSuite.summary.avg_duration_ms - beforeSuite.summary.avg_duration_ms,
    },
    per_test: afterSuite.results.map(after => {
      const before = beforeSuite.results.find(r => r.id === after.id);
      return {
        id: after.id,
        name: after.name,
        before_score: before?.score.total || 0,
        after_score: after.score.total,
        delta: after.score.total - (before?.score.total || 0),
      };
    }),
  };

  const reportPath = join(RESULTS_DIR, `comparison-${Date.now()}.json`);
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nComparison saved to: ${reportPath}`);
}

// Main
const args = process.argv.slice(2);

if (args.includes('--compare')) {
  compareResults();
} else if (args.includes('--phase')) {
  const phaseIndex = args.indexOf('--phase');
  const phase = args[phaseIndex + 1] as 'before' | 'after';
  if (phase !== 'before' && phase !== 'after') {
    console.error('Phase must be "before" or "after"');
    process.exit(1);
  }
  runTestSuite(phase).catch(console.error);
} else {
  console.log('Usage:');
  console.log('  npx tsx .ai/prompt-tests/run-tests.ts --phase before');
  console.log('  npx tsx .ai/prompt-tests/run-tests.ts --phase after');
  console.log('  npx tsx .ai/prompt-tests/run-tests.ts --compare');
}
