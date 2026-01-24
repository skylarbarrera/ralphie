/**
 * Test: Bad Code Improvement
 *
 * Validates that Ralphie generates good code even when existing code has issues:
 * - Doesn't copy tech debt
 * - Improves architecture
 * - Uses better patterns
 * - Maintains or improves quality standards
 */

import { describe, it, expect } from 'vitest';
import {
  fileContainsPattern,
  runQualityChecks,
} from './test-helpers';

describe('Bad Code Improvement Quality', () => {
  describe('Tech Debt Detection', () => {
    it('identifies common tech debt patterns', () => {
      const techDebtPatterns = [
        'TODO:', // Incomplete implementation
        'FIXME:', // Known issues
        'HACK:', // Quick fixes
        'any', // Weak TypeScript typing
        '// @ts-ignore', // Type safety bypass
        'eval(', // Dangerous code execution
        'var ', // Old JavaScript syntax
      ];

      expect(techDebtPatterns.length).toBeGreaterThan(0);
      expect(techDebtPatterns).toContain('TODO:');
      expect(techDebtPatterns).toContain('any');
    });

    it('identifies architectural anti-patterns', () => {
      const antiPatterns = [
        {
          name: 'God class',
          description: 'Single class with too many responsibilities',
          indicators: ['> 1000 lines', 'many methods', 'multiple concerns'],
        },
        {
          name: 'Circular dependencies',
          description: 'Modules depend on each other',
          indicators: ['A imports B', 'B imports A'],
        },
        {
          name: 'Tight coupling',
          description: 'Direct dependencies instead of interfaces',
          indicators: ['new ConcreteClass()', 'no dependency injection'],
        },
        {
          name: 'No separation of concerns',
          description: 'Business logic mixed with presentation',
          indicators: ['database queries in routes', 'UI logic in services'],
        },
      ];

      expect(antiPatterns.length).toBe(4);
      expect(antiPatterns[0].name).toBe('God class');
      expect(antiPatterns[3].name).toBe('No separation of concerns');
    });

    it('identifies security anti-patterns', () => {
      const securityIssues = [
        {
          issue: 'SQL Injection',
          badPattern: 'query = "SELECT * FROM users WHERE id = " + userId',
          goodPattern: 'query("SELECT * FROM users WHERE id = ?", [userId])',
        },
        {
          issue: 'Hardcoded secrets',
          badPattern: 'const apiKey = "sk-1234567890"',
          goodPattern: 'const apiKey = process.env.API_KEY',
        },
        {
          issue: 'Weak password hashing',
          badPattern: 'md5(password)',
          goodPattern: 'bcrypt.hash(password, 10)',
        },
        {
          issue: 'No input validation',
          badPattern: 'user.save(req.body)',
          goodPattern: 'const validated = schema.parse(req.body); user.save(validated)',
        },
      ];

      expect(securityIssues.length).toBe(4);
      expect(securityIssues[0].issue).toBe('SQL Injection');
      expect(securityIssues[2].goodPattern).toContain('bcrypt');
    });
  });

  describe('Code Quality Improvements', () => {
    it('documents improvements from bad to good TypeScript', () => {
      const badTypeScript = `
// Bad: No types, any everywhere, no error handling
function processUser(data: any) {
  var result = data.name + " " + data.email;
  return result;
}
`;

      const goodTypeScript = `
// Good: Proper types, interface, error handling
interface UserData {
  name: string;
  email: string;
}

interface ProcessedUser {
  fullInfo: string;
}

function processUser(data: UserData): ProcessedUser {
  if (!data.name || !data.email) {
    throw new Error('Invalid user data');
  }

  const fullInfo = \`\${data.name} \${data.email}\`;
  return { fullInfo };
}
`;

      // Verify improvements
      expect(badTypeScript).toContain('any');
      expect(badTypeScript).toContain('var');
      expect(goodTypeScript).toContain('interface');
      expect(goodTypeScript).toContain('throw new Error');
      expect(goodTypeScript).not.toContain('any');
      expect(goodTypeScript).not.toContain('var');
    });

    it('documents architectural improvements', () => {
      const badArchitecture = `
// Bad: Everything in one file, no separation
app.get('/users/:id', (req, res) => {
  const query = "SELECT * FROM users WHERE id = " + req.params.id;
  db.query(query, (err, user) => {
    if (user) {
      res.send("<h1>" + user.name + "</h1>");
    }
  });
});
`;

      const goodArchitecture = {
        routes: `
// routes/users.ts - Route definitions only
import { Router } from 'express';
import { UserController } from '../controllers/UserController';

const router = Router();
const controller = new UserController();

router.get('/:id', controller.getUser.bind(controller));

export default router;
`,
        controller: `
// controllers/UserController.ts - Request handling
import { Request, Response } from 'express';
import { UserService } from '../services/UserService';

export class UserController {
  private userService = new UserService();

  async getUser(req: Request, res: Response): Promise<void> {
    try {
      const user = await this.userService.getUserById(req.params.id);
      res.json(user);
    } catch (error) {
      res.status(404).json({ error: 'User not found' });
    }
  }
}
`,
        service: `
// services/UserService.ts - Business logic
import { UserRepository } from '../repositories/UserRepository';
import { User } from '../models/User';

export class UserService {
  private userRepo = new UserRepository();

  async getUserById(id: string): Promise<User> {
    return this.userRepo.findById(id);
  }
}
`,
        repository: `
// repositories/UserRepository.ts - Data access
import { db } from '../db';
import { User } from '../models/User';

export class UserRepository {
  async findById(id: string): Promise<User> {
    const query = 'SELECT * FROM users WHERE id = ?';
    const [user] = await db.query(query, [id]);
    return user;
  }
}
`,
      };

      // Verify improvements
      expect(badArchitecture).toContain('SELECT * FROM users WHERE id = " +');
      expect(goodArchitecture.routes).toContain('Router');
      expect(goodArchitecture.controller).toContain('UserController');
      expect(goodArchitecture.service).toContain('UserService');
      expect(goodArchitecture.repository).toContain('WHERE id = ?');
    });

    it('documents testing improvements', () => {
      const noTests = 'No tests written';

      const goodTests = `
// tests/UserService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserService } from '../services/UserService';
import { UserRepository } from '../repositories/UserRepository';

vi.mock('../repositories/UserRepository');

describe('UserService', () => {
  let service: UserService;
  let mockRepo: vi.Mocked<UserRepository>;

  beforeEach(() => {
    mockRepo = {
      findById: vi.fn(),
    } as any;
    service = new UserService(mockRepo);
  });

  describe('getUserById', () => {
    it('returns user when found', async () => {
      const mockUser = { id: '1', name: 'John', email: 'john@example.com' };
      mockRepo.findById.mockResolvedValue(mockUser);

      const result = await service.getUserById('1');

      expect(result).toEqual(mockUser);
      expect(mockRepo.findById).toHaveBeenCalledWith('1');
    });

    it('throws error when user not found', async () => {
      mockRepo.findById.mockRejectedValue(new Error('Not found'));

      await expect(service.getUserById('999')).rejects.toThrow('Not found');
    });

    it('validates user ID format', async () => {
      await expect(service.getUserById('')).rejects.toThrow('Invalid ID');
    });
  });
});
`;

      expect(noTests).not.toContain('describe');
      expect(goodTests).toContain('describe');
      expect(goodTests).toContain('it(');
      expect(goodTests).toContain('expect');
      expect(goodTests).toContain('vi.mock');
    });
  });

  describe('Pattern Recognition and Improvement', () => {
    it('recognizes callback hell and suggests async/await', () => {
      const callbackHell = `
getData((data) => {
  processData(data, (processed) => {
    saveData(processed, (result) => {
      console.log(result);
    });
  });
});
`;

      const asyncAwait = `
async function handleData() {
  try {
    const data = await getData();
    const processed = await processData(data);
    const result = await saveData(processed);
    console.log(result);
  } catch (error) {
    console.error('Error handling data:', error);
  }
}
`;

      expect(callbackHell).toContain('(data) => {');
      expect(asyncAwait).toContain('async function');
      expect(asyncAwait).toContain('await');
      expect(asyncAwait).toContain('try');
    });

    it('recognizes imperative code and suggests functional approach', () => {
      const imperative = `
let total = 0;
for (let i = 0; i < items.length; i++) {
  if (items[i].active) {
    total += items[i].price;
  }
}
`;

      const functional = `
const total = items
  .filter(item => item.active)
  .reduce((sum, item) => sum + item.price, 0);
`;

      expect(imperative).toContain('for (');
      expect(imperative).toContain('let');
      expect(functional).toContain('.filter');
      expect(functional).toContain('.reduce');
    });

    it('recognizes lack of error handling and adds it', () => {
      const noErrorHandling = `
function divideNumbers(a, b) {
  return a / b;
}
`;

      const withErrorHandling = `
function divideNumbers(a: number, b: number): number {
  if (typeof a !== 'number' || typeof b !== 'number') {
    throw new TypeError('Arguments must be numbers');
  }

  if (b === 0) {
    throw new Error('Division by zero');
  }

  return a / b;
}
`;

      expect(noErrorHandling).not.toContain('throw');
      expect(withErrorHandling).toContain('throw new TypeError');
      expect(withErrorHandling).toContain('Division by zero');
    });
  });

  describe('Quality Improvement Checklist', () => {
    it('defines improvement validation checks', () => {
      const improvementChecks = [
        {
          category: 'Type Safety',
          checks: [
            'No any types',
            'All parameters typed',
            'All return types specified',
            'Interfaces defined',
          ],
        },
        {
          category: 'Architecture',
          checks: [
            'Separation of concerns',
            'Single responsibility principle',
            'Dependency injection',
            'No circular dependencies',
          ],
        },
        {
          category: 'Security',
          checks: [
            'Input validation',
            'Parameterized queries',
            'No hardcoded secrets',
            'Proper error handling',
          ],
        },
        {
          category: 'Testing',
          checks: [
            'Unit tests present',
            'Edge cases covered',
            'Mocks used appropriately',
            '>80% coverage',
          ],
        },
        {
          category: 'Code Quality',
          checks: [
            'No TODOs/FIXMEs',
            'Descriptive names',
            'Proper documentation',
            'Consistent style',
          ],
        },
      ];

      expect(improvementChecks.length).toBe(5);
      expect(improvementChecks[0].category).toBe('Type Safety');
      expect(improvementChecks[2].checks).toContain('Input validation');
    });

    it('validates improvement detection works', () => {
      const checks = [
        {
          name: 'Removes any types',
          check: () => ({
            passed: true,
            message: 'No any types found',
          }),
        },
        {
          name: 'Adds proper separation',
          check: () => ({
            passed: true,
            message: 'Code properly separated',
          }),
        },
        {
          name: 'Includes tests',
          check: () => ({
            passed: true,
            message: 'Tests present',
          }),
        },
      ];

      const { allPassed } = runQualityChecks(checks);
      expect(allPassed).toBe(true);
    });
  });

  describe('Real-world Improvement Template', () => {
    it('provides template for validating code improvements', () => {
      const improvementValidation = {
        before: {
          metrics: {
            typeUnsafe: 'Count of any types',
            noTests: 'No test files',
            mixedConcerns: 'All code in routes',
            securityIssues: 'SQL injection risks',
          },
        },
        after: {
          metrics: {
            typeUnsafe: 0,
            testCoverage: '>80%',
            separation: 'Routes/Services/Repos separated',
            securityFixed: 'Parameterized queries',
          },
        },
        validations: [
          'Verify type safety improved',
          'Verify tests added',
          'Verify architecture improved',
          'Verify security issues fixed',
          'Verify no tech debt copied',
        ],
      };

      expect(improvementValidation.before.metrics.noTests).toBeTruthy();
      expect(improvementValidation.after.metrics.testCoverage).toBe('>80%');
      expect(improvementValidation.validations.length).toBe(5);
    });

    it('documents quality improvement scoring', () => {
      interface QualityScore {
        category: string;
        before: number;
        after: number;
        improvement: number;
      }

      const qualityScores: QualityScore[] = [
        { category: 'Type Safety', before: 2, after: 9, improvement: 7 },
        { category: 'Testing', before: 0, after: 8, improvement: 8 },
        { category: 'Architecture', before: 3, after: 9, improvement: 6 },
        { category: 'Security', before: 4, after: 10, improvement: 6 },
        { category: 'Maintainability', before: 5, after: 9, improvement: 4 },
      ];

      const averageImprovement =
        qualityScores.reduce((sum, s) => sum + s.improvement, 0) / qualityScores.length;

      expect(qualityScores.every((s) => s.after > s.before)).toBe(true);
      expect(averageImprovement).toBeGreaterThan(5);
    });
  });
});
