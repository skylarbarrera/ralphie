# Architecture Violations Test Cases

This document contains intentional architecture violations for testing the architecture-strategist agent.

## Test Case 1: Manual JSON.parse without Validation

**File:** `src/lib/config-loader-bad.ts`

```typescript
import { readFileSync } from 'fs';

interface Settings {
  apiKey?: string;
  timeout?: number;
  retries?: number;
}

export function loadSettings(filePath: string): Settings {
  const content = readFileSync(filePath, 'utf-8');
  const settings = JSON.parse(content) as Settings;
  return settings;
}
```

**Expected Issues:**
- ❌ Using `JSON.parse()` with type assertion instead of schema validation
- ❌ No runtime validation that `timeout` is a number
- ❌ No validation that `apiKey` is a string
- ❌ Silent failures if invalid data structure

**Recommendation:**
```typescript
import { z } from 'zod';

const SettingsSchema = z.object({
  apiKey: z.string().optional(),
  timeout: z.number().positive().optional(),
  retries: z.number().int().min(0).optional(),
});

export function loadSettings(filePath: string): Settings {
  const content = readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content);
  const settings = SettingsSchema.parse(data); // Throws on invalid data
  return settings;
}
```

---

## Test Case 2: Inconsistent Error Handling

**Files:**
- `src/lib/loader-a.ts` - returns null
- `src/lib/loader-b.ts` - throws error
- `src/lib/loader-c.ts` - returns undefined

```typescript
// loader-a.ts - Returns null on error
export function loadConfigA(path: string): Config | null {
  try {
    return parseConfig(path);
  } catch (error) {
    return null;
  }
}

// loader-b.ts - Throws error
export function loadConfigB(path: string): Config {
  if (!existsSync(path)) {
    throw new Error('Config not found');
  }
  return parseConfig(path);
}

// loader-c.ts - Returns undefined
export function loadConfigC(path: string): Config | undefined {
  if (!existsSync(path)) {
    return undefined;
  }
  try {
    return parseConfig(path);
  } catch {
    return undefined;
  }
}
```

**Expected Issues:**
- ❌ Three different error handling patterns in same module
- ❌ Callers don't know whether to use null checks, try-catch, or undefined checks
- ❌ No consistency across codebase

**Recommendation:**
Pick ONE pattern and apply consistently:

```typescript
// Option 1: Consistent throwing with documented errors
/**
 * @throws {ConfigNotFoundError} If config file doesn't exist
 * @throws {ConfigParseError} If config file is malformed
 */
export function loadConfig(path: string): Config {
  if (!existsSync(path)) {
    throw new ConfigNotFoundError(path);
  }
  return parseConfig(path);
}

// Option 2: Result type pattern
type Result<T> =
  | { success: true; data: T }
  | { success: false; error: Error };

export function loadConfig(path: string): Result<Config> {
  try {
    if (!existsSync(path)) {
      return { success: false, error: new Error('Not found') };
    }
    return { success: true, data: parseConfig(path) };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
```

---

## Test Case 3: YAML Parsing with Type Assertion

**File:** `src/lib/yaml-config.ts`

```typescript
import yaml from 'js-yaml';
import { readFileSync } from 'fs';

interface AppConfig {
  database: {
    host: string;
    port: number;
    credentials: {
      username: string;
      password: string;
    };
  };
  features: {
    enableCache: boolean;
    maxConnections: number;
  };
}

export function loadAppConfig(path: string): AppConfig {
  const content = readFileSync(path, 'utf-8');
  const config = yaml.load(content) as AppConfig;
  return config;
}
```

**Expected Issues:**
- ❌ YAML loaded with type assertion, no runtime validation
- ❌ No validation that `port` is a number
- ❌ No validation that nested structure exists
- ❌ Runtime errors if YAML has wrong structure

**Recommendation:**
```typescript
import { z } from 'zod';

const AppConfigSchema = z.object({
  database: z.object({
    host: z.string(),
    port: z.number().int().positive(),
    credentials: z.object({
      username: z.string().min(1),
      password: z.string().min(1),
    }),
  }),
  features: z.object({
    enableCache: z.boolean(),
    maxConnections: z.number().int().positive(),
  }),
});

type AppConfig = z.infer<typeof AppConfigSchema>;

export function loadAppConfig(path: string): AppConfig {
  const content = readFileSync(path, 'utf-8');
  const data = yaml.load(content);
  const config = AppConfigSchema.parse(data);
  return config;
}
```

---

## Test Case 4: Circular Dependencies

**Files:**
- `src/modules/auth/auth-service.ts`
- `src/modules/user/user-service.ts`

```typescript
// auth-service.ts
import { UserService } from '../user/user-service.js';

export class AuthService {
  constructor(private userService: UserService) {}

  async authenticate(username: string, password: string) {
    const user = await this.userService.findByUsername(username);
    // ... authentication logic
  }
}

// user-service.ts
import { AuthService } from '../auth/auth-service.js';

export class UserService {
  constructor(private authService: AuthService) {}

  async createUser(username: string, password: string) {
    // ... user creation
    await this.authService.authenticate(username, password);
  }
}
```

**Expected Issues:**
- ❌ Circular dependency: AuthService → UserService → AuthService
- ❌ Tight coupling between services
- ❌ Difficult to test in isolation

**Recommendation:**
```typescript
// Introduce abstraction to break cycle
// auth-service.ts
import { IUserRepository } from '../user/interfaces.js';

export class AuthService {
  constructor(private userRepo: IUserRepository) {}

  async authenticate(username: string, password: string) {
    const user = await this.userRepo.findByUsername(username);
    // ... authentication logic
  }
}

// user-service.ts
export class UserService implements IUserRepository {
  async createUser(username: string, password: string) {
    // ... user creation (no auth dependency)
  }

  async findByUsername(username: string) {
    // ... find user
  }
}
```

---

## Test Case 5: Business Logic in Presentation Layer

**File:** `src/ui/components/CheckoutForm.tsx`

```typescript
export function CheckoutForm({ cart }: Props) {
  const [total, setTotal] = useState(0);

  useEffect(() => {
    // ❌ Business logic in UI component
    let sum = 0;
    for (const item of cart.items) {
      sum += item.price * item.quantity;
    }

    // Apply discounts (business rules)
    if (sum > 100) {
      sum *= 0.9; // 10% discount
    }
    if (cart.hasCoupon) {
      sum *= 0.85; // Additional 15% off
    }

    // Apply tax (business rules)
    const tax = sum * 0.08;
    sum += tax;

    setTotal(sum);
  }, [cart]);

  return <div>Total: ${total}</div>;
}
```

**Expected Issues:**
- ❌ Business logic (discount, tax calculation) in UI component
- ❌ Violates separation of concerns
- ❌ Can't reuse calculation logic elsewhere
- ❌ Difficult to test business rules

**Recommendation:**
```typescript
// Extract business logic to service
// src/services/cart-service.ts
export class CartService {
  calculateTotal(cart: Cart): number {
    let subtotal = cart.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    subtotal = this.applyDiscounts(subtotal, cart);
    const tax = this.calculateTax(subtotal);

    return subtotal + tax;
  }

  private applyDiscounts(amount: number, cart: Cart): number {
    if (amount > 100) {
      amount *= 0.9;
    }
    if (cart.hasCoupon) {
      amount *= 0.85;
    }
    return amount;
  }

  private calculateTax(amount: number): number {
    return amount * 0.08;
  }
}

// UI component
export function CheckoutForm({ cart }: Props) {
  const cartService = useCartService();
  const total = cartService.calculateTotal(cart);

  return <div>Total: ${total}</div>;
}
```

---

## Expected Agent Behavior

When reviewing code with these violations, the architecture-strategist agent should:

1. **Identify Each Violation** with specific file and line references
2. **Explain Impact** of each violation on maintainability, testability, scalability
3. **Prioritize Issues**:
   - P1 (Critical): Circular dependencies, business logic in UI
   - P2 (High): Manual validation without schema, inconsistent error handling
   - P3 (Medium): Missing JSDoc, unclear naming
4. **Provide Recommendations** with code examples showing how to fix
5. **Reference Libraries**: Suggest Zod for TypeScript, Pydantic for Python
6. **Document Patterns**: Recommend documenting error handling strategy in llms.txt

---

## Success Criteria

✅ Agent catches manual JSON.parse and recommends Zod
✅ Agent catches inconsistent error handling patterns
✅ Agent catches YAML parsing with type assertions
✅ Agent catches circular dependencies
✅ Agent catches business logic in presentation layer
✅ Agent provides specific, actionable recommendations
✅ Agent prioritizes issues appropriately (P1/P2/P3)
