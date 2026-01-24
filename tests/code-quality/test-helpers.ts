/**
 * Helper functions for code quality validation tests
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

export interface QualityCheckResult {
  passed: boolean;
  message: string;
  details?: string[];
}

/**
 * Check if a file exists
 */
export function fileExists(path: string): QualityCheckResult {
  const exists = existsSync(path);
  return {
    passed: exists,
    message: exists ? `File exists: ${path}` : `File missing: ${path}`,
  };
}

/**
 * Check if a file contains specific patterns (library imports, class definitions, etc.)
 */
export function fileContainsPattern(
  path: string,
  patterns: string[],
  description: string
): QualityCheckResult {
  if (!existsSync(path)) {
    return {
      passed: false,
      message: `Cannot check ${description}: file ${path} does not exist`,
    };
  }

  const content = readFileSync(path, 'utf-8');
  const found: string[] = [];
  const missing: string[] = [];

  patterns.forEach((pattern) => {
    if (content.includes(pattern)) {
      found.push(pattern);
    } else {
      missing.push(pattern);
    }
  });

  return {
    passed: missing.length === 0,
    message:
      missing.length === 0
        ? `${description} found in ${path}`
        : `${description} missing in ${path}`,
    details: missing.length > 0 ? missing : undefined,
  };
}

/**
 * Check if a file contains TypeScript interfaces
 */
export function hasTypeScriptInterfaces(
  path: string
): QualityCheckResult {
  if (!existsSync(path)) {
    return {
      passed: false,
      message: `Cannot check interfaces: file ${path} does not exist`,
    };
  }

  const content = readFileSync(path, 'utf-8');
  const hasInterface = /interface\s+\w+/.test(content);
  const hasType = /type\s+\w+\s*=/.test(content);

  return {
    passed: hasInterface || hasType,
    message:
      hasInterface || hasType
        ? `TypeScript types defined in ${path}`
        : `No TypeScript interfaces or types found in ${path}`,
  };
}

/**
 * Check for proper separation of concerns - expects multiple files with specific patterns
 */
export function checkSeparationOfConcerns(
  basePath: string,
  expectedStructure: { file: string; patterns: string[] }[]
): QualityCheckResult {
  const results: string[] = [];
  let allPassed = true;

  expectedStructure.forEach(({ file, patterns }) => {
    const filePath = join(basePath, file);
    if (!existsSync(filePath)) {
      results.push(`Missing: ${file}`);
      allPassed = false;
      return;
    }

    const content = readFileSync(filePath, 'utf-8');
    patterns.forEach((pattern) => {
      if (!content.includes(pattern)) {
        results.push(`${file} missing pattern: ${pattern}`);
        allPassed = false;
      }
    });
  });

  return {
    passed: allPassed,
    message: allPassed
      ? 'Proper separation of concerns maintained'
      : 'Separation of concerns issues found',
    details: allPassed ? undefined : results,
  };
}

/**
 * Check if tests exist for the generated code
 */
export function hasTests(basePath: string): QualityCheckResult {
  const testPatterns = ['.test.ts', '.spec.ts', '.test.js', '.spec.js', '_test.py', 'test_'];

  try {
    const files = getAllFiles(basePath);
    const testFiles = files.filter((file) =>
      testPatterns.some((pattern) => file.includes(pattern))
    );

    return {
      passed: testFiles.length > 0,
      message:
        testFiles.length > 0
          ? `Found ${testFiles.length} test file(s)`
          : 'No test files found',
      details: testFiles.length > 0 ? testFiles : undefined,
    };
  } catch (error) {
    return {
      passed: false,
      message: `Error checking for tests: ${error}`,
    };
  }
}

/**
 * Recursively get all files in a directory
 */
function getAllFiles(dirPath: string, fileList: string[] = []): string[] {
  if (!existsSync(dirPath)) {
    return fileList;
  }

  const files = readdirSync(dirPath, { withFileTypes: true });

  files.forEach((file) => {
    const filePath = join(dirPath, file.name);
    if (file.isDirectory()) {
      getAllFiles(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  });

  return fileList;
}

/**
 * Check for security anti-patterns
 */
export function checkSecurityPatterns(
  path: string
): QualityCheckResult {
  if (!existsSync(path)) {
    return {
      passed: false,
      message: `Cannot check security: file ${path} does not exist`,
    };
  }

  const content = readFileSync(path, 'utf-8');
  const issues: string[] = [];

  // Check for SQL injection risks
  if (/\$\{.*\}/.test(content) && /select|insert|update|delete/i.test(content)) {
    issues.push('Potential SQL injection: string interpolation in SQL query');
  }

  // Check for hardcoded secrets
  if (/password\s*[:=]\s*["'][^"']+["']|secret\s*[:=]\s*["'][^"']+["']|api_key\s*[:=]\s*["'][^"']+["']/i.test(content)) {
    issues.push('Potential hardcoded secret');
  }

  // Check for insecure randomness
  if (/Math\.random\(\)/.test(content) && /token|secret|key|password/i.test(content)) {
    issues.push('Using Math.random() for security-sensitive data');
  }

  return {
    passed: issues.length === 0,
    message:
      issues.length === 0
        ? 'No obvious security issues found'
        : `Security issues found in ${path}`,
    details: issues.length > 0 ? issues : undefined,
  };
}

/**
 * Check if package.json contains expected dependencies
 */
export function hasDependencies(
  packageJsonPath: string,
  expectedDeps: string[]
): QualityCheckResult {
  if (!existsSync(packageJsonPath)) {
    return {
      passed: false,
      message: `package.json not found at ${packageJsonPath}`,
    };
  }

  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  const missing = expectedDeps.filter((dep) => !allDeps[dep]);

  return {
    passed: missing.length === 0,
    message:
      missing.length === 0
        ? 'All expected dependencies present'
        : 'Missing expected dependencies',
    details: missing.length > 0 ? missing : undefined,
  };
}

/**
 * Run multiple quality checks and aggregate results
 */
export function runQualityChecks(
  checks: Array<{ name: string; check: () => QualityCheckResult }>
): { allPassed: boolean; results: Array<{ name: string; result: QualityCheckResult }> } {
  const results = checks.map(({ name, check }) => ({
    name,
    result: check(),
  }));

  const allPassed = results.every((r) => r.result.passed);

  return { allPassed, results };
}

/**
 * Format quality check results for display
 */
export function formatResults(
  results: Array<{ name: string; result: QualityCheckResult }>
): string {
  return results
    .map(({ name, result }) => {
      const status = result.passed ? '✓' : '✗';
      let output = `${status} ${name}: ${result.message}`;
      if (result.details && result.details.length > 0) {
        output += '\n  ' + result.details.join('\n  ');
      }
      return output;
    })
    .join('\n');
}
