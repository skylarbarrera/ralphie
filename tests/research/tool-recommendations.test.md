# Test: Research Agents Recommend Best Tools

**Date:** 2026-01-22
**Task:** T002 - Verify research agents recommend best-in-class tools with rationale

## Test Scenario

**Given:** A task requiring user input validation
**When:** Research agents analyze the requirement
**Then:** They should recommend appropriate validation libraries with:
- Specific tool recommendations (Zod, Pydantic)
- Rationale for recommendations
- Comparison with alternatives
- Code examples
- When to use / when not to use guidance

## Test Cases

### Test Case 1: TypeScript Validation Task

**Input Task:** "Add validation for user registration endpoint (TypeScript/Express)"

**Expected Research Output Should Include:**

```markdown
## Tool Recommendations

### JSON Schema Validation
- **Recommended Tool**: Zod
- **Rationale**:
  - Type inference eliminates duplicate type definitions
  - Composable schema building
  - Excellent TypeScript support
  - Small bundle size (~8kb minified)
  - Comprehensive error messages
- **Alternatives Considered**:
  - Joi: Larger bundle, no type inference, but more mature
  - io-ts: More functional programming focused, steeper learning curve
  - Yup: Similar API but less TypeScript-native
  - AJV: Fastest, but requires separate type definitions
- **Example**:
  ```typescript
  import { z } from 'zod';

  const RegisterSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    age: z.number().int().positive().optional()
  });

  type RegisterInput = z.infer<typeof RegisterSchema>;
  ```
- **When to Use**: TypeScript projects requiring runtime validation with type safety
- **When NOT to Use**: Need JSON Schema standard compliance (use AJV)
```

**Expected Flags in Repository Research:**
- Flag manual JSON.parse without validation
- Note missing input validation on API boundaries
- Recommend validation middleware for Express

### Test Case 2: Python Validation Task

**Input Task:** "Add input validation for FastAPI endpoints (Python)"

**Expected Research Output Should Include:**

```markdown
## Tool Recommendations

### Data Validation
- **Recommended Tool**: Pydantic
- **Rationale**:
  - Native FastAPI integration
  - Type hints provide validation
  - Automatic OpenAPI schema generation
  - Clear validation error messages
  - Built-in data coercion
- **Alternatives Considered**:
  - Marshmallow: More configuration, less type-hint focused
  - Cerberus: Dictionary-based, no type hints
  - attrs + cattrs: Good for dataclasses, but less validation
- **Example**:
  ```python
  from pydantic import BaseModel, EmailStr, validator

  class User(BaseModel):
      email: EmailStr
      password: str
      age: int | None = None

      @validator('password')
      def password_strength(cls, v):
          if len(v) < 8:
              raise ValueError('Password must be at least 8 characters')
          return v
  ```
- **When to Use**: FastAPI projects, any Python code needing validation
- **When NOT to Use**: Simple scripts with minimal validation needs
```

### Test Case 3: Authentication Task

**Input Task:** "Implement user authentication with password hashing"

**Expected Research Output Should Include:**

```markdown
## Tool Recommendations

### Password Hashing
- **Recommended Tool**: bcrypt
- **Rationale**:
  - Industry standard for password hashing
  - Automatic salting
  - Configurable work factor
  - Resistant to rainbow table attacks
  - Cross-platform support
- **Alternatives Considered**:
  - argon2: Newer, more secure, but less widely adopted
  - scrypt: Good, but bcrypt more battle-tested
  - pbkdf2: Older, bcrypt preferred
- **Example**:
  ```typescript
  import bcrypt from 'bcrypt';

  // Hash password
  const hash = await bcrypt.hash(password, 10);

  // Verify password
  const isValid = await bcrypt.compare(password, hash);
  ```
- **When to Use**: All password storage scenarios
- **When NOT to Use**: Never use plain text or MD5/SHA-256 alone

### Authentication Strategy
- **Recommended Tool**: Passport.js (Express) or NextAuth.js (Next.js)
- **Rationale**: [Similar format...]
```

## Verification Checklist

For research output to pass, it must include:

- [ ] **Specific Tool Name** (not just "use a validation library")
- [ ] **Rationale** explaining why this tool over others
- [ ] **Alternatives Considered** with trade-offs
- [ ] **Code Example** showing actual usage
- [ ] **When to Use** guidance
- [ ] **When NOT to Use** guidance
- [ ] **Flags for Manual Implementations** in repo research
- [ ] **Current vs. Better** approach comparison

## Anti-Patterns to Catch

Research should flag these manual implementations:

```typescript
// ❌ BAD: Manual JSON.parse without validation
const data = JSON.parse(req.body) as UserData;

// ✅ GOOD: Zod validation
const data = UserSchema.parse(JSON.parse(req.body));
```

```typescript
// ❌ BAD: Regex email validation
if (!/\S+@\S+\.\S+/.test(email)) { throw new Error('Invalid email'); }

// ✅ GOOD: Zod email validation
const EmailSchema = z.string().email();
EmailSchema.parse(email);
```

```python
# ❌ BAD: Manual type checking
if not isinstance(age, int) or age < 0:
    raise ValueError("Invalid age")

# ✅ GOOD: Pydantic validation
class User(BaseModel):
    age: int = Field(ge=0)
```

## Test Results

**Status:** PENDING (will run after implementation)

**Expected Outcome:**
- Repo research analyst identifies manual implementations
- Best practices researcher recommends specific tools
- Both agents provide rationale and examples
- Output follows expected format

**Actual Outcome:**
[To be filled after running test]

## How to Run This Test

1. Create a sample spec: "Add user input validation to API"
2. Run research orchestrator
3. Check output includes:
   - Tool recommendations section
   - Specific library names (Zod, Pydantic)
   - Rationale and comparisons
   - Code examples
4. Verify repo research flags manual implementations

## Notes

This test validates that research agents now:
- Actively recommend tools (not just observe existing patterns)
- Provide rationale (why X over Y)
- Include practical examples
- Flag opportunities for improvement

This addresses the T001 audit finding:
> "Research should answer 'what SHOULD we use' not just 'what exists'"
