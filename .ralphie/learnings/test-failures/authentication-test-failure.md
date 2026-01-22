---
problem: Authentication tests failing due to missing JWT secret
symptoms: "Error: JWT_SECRET environment variable not defined"
root-cause: Tests run without loading environment variables
solution: Load .env.test file in test setup or use dotenv in test config
prevention: Add environment validation in test setup file
tags: [authentication, testing, jwt, environment-variables]
---

# Authentication Test Failure - Missing JWT Secret

## Problem
When running authentication tests, they consistently fail with:
```
Error: JWT_SECRET environment variable not defined
```

## Root Cause
The test environment wasn't loading environment variables from `.env.test` file. The JWT implementation checks for `process.env.JWT_SECRET` on initialization.

## Solution
Add `dotenv` configuration to test setup:

```typescript
// tests/setup.ts
import { config } from 'dotenv';
config({ path: '.env.test' });
```

Or in vitest.config.ts:
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    env: {
      JWT_SECRET: 'test-secret-key'
    }
  }
});
```

## Prevention
1. Add environment validation in test setup file
2. Create `.env.test.example` with all required variables
3. Document required environment variables in test README
4. Use a test-specific configuration that provides defaults
