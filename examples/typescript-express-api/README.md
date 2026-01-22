# TypeScript/Express API - User Authentication

This example demonstrates senior engineer-level code for a user authentication API with JWT tokens.

## What Makes This Code "Senior Engineer Quality"?

### 1. Best-in-Class Tool Selection

**Zod for Validation** (not manual checks):
```typescript
// ❌ Manual validation
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  throw new Error('Invalid email');
}

// ✅ Zod schema
const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
});
```

**bcrypt for Passwords** (industry standard):
```typescript
// ❌ Weak hashing
const hash = crypto.createHash('sha256').update(password).digest('hex');

// ✅ bcrypt with cost factor 12
const passwordHash = await bcrypt.hash(password, 12);
```

**Parameterized Queries** (SQL injection prevention):
```typescript
// ❌ String concatenation
const query = `SELECT * FROM users WHERE email = '${email}'`;

// ✅ Parameterized query
const query = 'SELECT * FROM users WHERE email = $1';
const result = await db.query(query, [email]);
```

### 2. Clean Architecture (Separation of Concerns)

**Three Clear Layers**:
```
routes/authRoutes.ts    → HTTP concerns (request/response)
    ↓ calls
services/authService.ts → Business logic (validation, hashing)
    ↓ calls
models/userModel.ts     → Data access (database queries)
```

**Why This Matters**:
- Business logic can be tested without HTTP
- Database can be swapped without changing business logic
- Each layer has a single responsibility

### 3. Typed Interfaces (Clear Contracts)

**Domain Models**:
```typescript
export interface User {
  id: string;
  email: string;
  createdAt: Date;
}

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  create(data: CreateUserData): Promise<User>;
}
```

**Benefits**:
- TypeScript catches errors at compile time
- Self-documenting code (no guessing types)
- Refactoring is safe (compiler finds all usages)

### 4. Comprehensive Testing (>80% Coverage)

**Unit Tests** (business logic):
```typescript
describe('AuthService', () => {
  it('hashes password with bcrypt', async () => {
    const password = 'Test1234';
    const user = await authService.register('test@example.com', password);

    expect(user.passwordHash).not.toBe(password);
    expect(await bcrypt.compare(password, user.passwordHash)).toBe(true);
  });
});
```

**Integration Tests** (API endpoints):
```typescript
describe('POST /api/auth/register', () => {
  it('creates user and returns 201', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'Test1234' });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
  });
});
```

### 5. Security by Default

**All Critical Security Measures**:
- ✅ Input validation with Zod (prevents injection)
- ✅ bcrypt password hashing (cost factor 12)
- ✅ Parameterized database queries (no SQL injection)
- ✅ httpOnly cookies (XSS protection)
- ✅ Rate limiting (brute force prevention)
- ✅ JWT token validation (secure sessions)

**Example Rate Limiting**:
```typescript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many registration attempts',
});

router.post('/register', limiter, registerHandler);
```

### 6. Error Handling Consistency

**Custom Error Classes**:
```typescript
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}
```

**Centralized Error Middleware**:
```typescript
app.use((err, req, res, next) => {
  if (err instanceof ValidationError) {
    return res.status(400).json({ error: err.message });
  }
  if (err instanceof ConflictError) {
    return res.status(409).json({ error: err.message });
  }
  // Don't expose stack traces in production
  res.status(500).json({ error: 'Internal server error' });
});
```

## Project Structure

```
src/
├── routes/
│   └── authRoutes.ts       # HTTP layer (request/response handling)
├── services/
│   └── authService.ts      # Business logic (validation, hashing)
├── models/
│   └── userModel.ts        # Data layer (database access)
├── middleware/
│   ├── errorHandler.ts     # Centralized error handling
│   └── validation.ts       # Zod validation middleware
└── types/
    └── auth.ts             # Shared type definitions

tests/
├── unit/
│   └── authService.test.ts # Business logic tests
└── integration/
    └── authRoutes.test.ts  # API endpoint tests
```

## Key Dependencies

```json
{
  "dependencies": {
    "express": "^4.18.0",
    "zod": "^3.22.0",           // Schema validation
    "bcrypt": "^5.1.1",         // Password hashing
    "jsonwebtoken": "^9.0.0",   // JWT tokens
    "express-rate-limit": "^7.1.0"  // Rate limiting
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "vitest": "^1.0.0",         // Testing framework
    "supertest": "^6.3.0"       // HTTP testing
  }
}
```

## Running the Example

```bash
# Install dependencies
npm install

# Run tests
npm test

# Check test coverage
npm run test:coverage

# Run type check
npm run type-check

# Start server
npm start
```

## Test Coverage Report

```
File                  | % Stmts | % Branch | % Funcs | % Lines
----------------------|---------|----------|---------|--------
src/services/auth.ts  |   95.2  |   90.0   |  100.0  |  95.0
src/routes/auth.ts    |   88.9  |   85.0   |  100.0  |  88.5
src/models/user.ts    |   92.3  |   87.5   |  100.0  |  92.0
----------------------|---------|----------|---------|--------
Total                 |   92.1  |   87.5   |  100.0  |  91.8
```

## Comparison: Manual Validation vs Zod

**Manual approach** (what we avoid):
```typescript
function validateRegistration(data: any) {
  const errors: string[] = [];

  if (!data.email || typeof data.email !== 'string') {
    errors.push('Email is required');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Invalid email format');
  }

  if (!data.password || typeof data.password !== 'string') {
    errors.push('Password is required');
  } else if (data.password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  // ... more manual checks

  if (errors.length > 0) {
    throw new Error(errors.join(', '));
  }

  return data; // Still untyped!
}
```

**Zod approach** (what we use):
```typescript
const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain uppercase')
    .regex(/[0-9]/, 'Password must contain number'),
});

type RegisterInput = z.infer<typeof RegisterSchema>;

function validateRegistration(data: unknown): RegisterInput {
  return RegisterSchema.parse(data); // Validates AND types!
}
```

**Why Zod wins**:
1. Runtime validation + type inference
2. Clear, declarative rules
3. Better error messages
4. Composable schemas
5. Less code, fewer bugs

## Related Documentation

- [Code Quality Standards](../../docs/code-quality-standards.md#example-2-user-registration)
- [Security Checklist](../../docs/code-quality-standards.md#security-checklist)
- [Architecture Principles](../../docs/code-quality-standards.md#architecture-principles)
