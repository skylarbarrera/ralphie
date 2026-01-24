# Security Violations Test Cases

This document contains intentional security vulnerabilities for testing the security-sentinel agent.

## Test Case 1: SQL Injection via String Concatenation

**File:** `src/db/user-query-bad.ts`

```typescript
import { db } from './connection.js';

export async function getUserByEmail(email: string) {
  // ❌ SQL injection vulnerability - string concatenation
  const query = `SELECT * FROM users WHERE email = '${email}'`;
  const result = await db.query(query);
  return result.rows[0];
}

export async function searchUsers(searchTerm: string, orderBy: string) {
  // ❌ SQL injection in ORDER BY clause
  const query = `SELECT * FROM users WHERE name LIKE '%${searchTerm}%' ORDER BY ${orderBy}`;
  const result = await db.query(query);
  return result.rows;
}
```

**Expected Issues:**
- ❌ **Critical**: SQL injection in `getUserByEmail` - attacker can inject: `' OR '1'='1`
- ❌ **Critical**: SQL injection in `searchUsers` - both searchTerm and orderBy are vulnerable
- ❌ Direct string concatenation instead of parameterized queries

**Recommendation:**
```typescript
export async function getUserByEmail(email: string) {
  // ✅ Use parameterized queries
  const query = 'SELECT * FROM users WHERE email = $1';
  const result = await db.query(query, [email]);
  return result.rows[0];
}

export async function searchUsers(searchTerm: string, orderBy: string) {
  // ✅ Parameterize search term, whitelist ORDER BY columns
  const allowedColumns = ['name', 'created_at', 'email'];
  if (!allowedColumns.includes(orderBy)) {
    throw new Error('Invalid sort column');
  }
  const query = `SELECT * FROM users WHERE name LIKE $1 ORDER BY ${orderBy}`;
  const result = await db.query(query, [`%${searchTerm}%`]);
  return result.rows;
}
```

---

## Test Case 2: XSS via Unsafe DOM Manipulation

**File:** `src/ui/render-user-content.ts`

```typescript
export function renderUserComment(comment: string): void {
  const container = document.getElementById('comments');
  if (container) {
    // ❌ XSS vulnerability - unescaped user content
    container.innerHTML = comment;
  }
}

export function displayUsername(username: string): void {
  // ❌ XSS via direct DOM manipulation
  document.getElementById('username')!.innerHTML = `<h1>${username}</h1>`;
}

// React component
export function UserBio({ bio }: { bio: string }) {
  // ❌ XSS via dangerouslySetInnerHTML without sanitization
  return <div dangerouslySetInnerHTML={{ __html: bio }} />;
}
```

**Expected Issues:**
- ❌ **High**: XSS in `renderUserComment` - attacker can inject: `<script>alert('XSS')</script>`
- ❌ **High**: XSS in `displayUsername` - vulnerable to script injection
- ❌ **High**: XSS in React component - dangerouslySetInnerHTML used without sanitization

**Recommendation:**
```typescript
import DOMPurify from 'dompurify';

export function renderUserComment(comment: string): void {
  const container = document.getElementById('comments');
  if (container) {
    // ✅ Use textContent for plain text
    container.textContent = comment;
    // Or sanitize if HTML is needed
    // container.innerHTML = DOMPurify.sanitize(comment);
  }
}

export function displayUsername(username: string): void {
  // ✅ Use textContent, not innerHTML
  const element = document.getElementById('username');
  if (element) {
    const heading = document.createElement('h1');
    heading.textContent = username;
    element.appendChild(heading);
  }
}

// React component
export function UserBio({ bio }: { bio: string }) {
  // ✅ Sanitize before rendering
  const sanitizedBio = DOMPurify.sanitize(bio);
  return <div dangerouslySetInnerHTML={{ __html: sanitizedBio }} />;
}
```

---

## Test Case 3: Hardcoded Secrets

**File:** `src/config/api-keys.ts`

```typescript
// ❌ Hardcoded API keys in source code
export const API_CONFIG = {
  stripeKey: 'sk_live_FAKE_KEY_FOR_TESTING_ONLY',
  twilioSid: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  twilioToken: 'your_auth_token_here',
  databaseUrl: 'postgresql://admin:password123@prod-db.example.com:5432/myapp',
  jwtSecret: 'super-secret-key-12345',
};

// ❌ API key in function
export async function sendEmail(to: string, subject: string, body: string) {
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    headers: {
      Authorization: 'Bearer SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    },
    // ...
  });
}
```

**Expected Issues:**
- ❌ **Critical**: Hardcoded Stripe live API key
- ❌ **Critical**: Hardcoded Twilio credentials
- ❌ **Critical**: Database password in connection string
- ❌ **Critical**: JWT secret hardcoded
- ❌ **Critical**: SendGrid API key hardcoded

**Recommendation:**
```typescript
// ✅ Use environment variables
export const API_CONFIG = {
  stripeKey: process.env.STRIPE_API_KEY!,
  twilioSid: process.env.TWILIO_ACCOUNT_SID!,
  twilioToken: process.env.TWILIO_AUTH_TOKEN!,
  databaseUrl: process.env.DATABASE_URL!,
  jwtSecret: process.env.JWT_SECRET!,
};

// Validate at startup
if (!API_CONFIG.stripeKey || !API_CONFIG.jwtSecret) {
  throw new Error('Missing required environment variables');
}

// ✅ Environment variable with validation
export async function sendEmail(to: string, subject: string, body: string) {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    throw new Error('SENDGRID_API_KEY not configured');
  }

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    // ...
  });
}
```

**Additional:** Ensure `.env` is in `.gitignore`:
```gitignore
.env
.env.local
.env.*.local
```

---

## Test Case 4: Missing Input Validation

**File:** `src/api/user-registration.ts`

```typescript
interface RegisterRequest {
  email: string;
  password: string;
  age: number;
}

export async function registerUser(req: RegisterRequest) {
  // ❌ No input validation
  const user = await db.createUser({
    email: req.email,
    password: req.password, // ❌ Password stored in plaintext
    age: req.age,
  });

  return user;
}

export async function uploadFile(file: any) {
  // ❌ No file type validation
  // ❌ No file size validation
  const filename = file.originalname;
  await fs.writeFile(`/uploads/${filename}`, file.buffer);
  return { path: `/uploads/${filename}` };
}
```

**Expected Issues:**
- ❌ **High**: No email format validation
- ❌ **High**: No password strength requirements
- ❌ **Critical**: Password stored in plaintext
- ❌ **High**: No age range validation
- ❌ **High**: No file type validation (arbitrary file upload)
- ❌ **High**: No file size limit (DoS vector)
- ❌ **High**: Potential path traversal in filename

**Recommendation:**
```typescript
import { z } from 'zod';
import bcrypt from 'bcrypt';
import path from 'path';

const RegisterSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain uppercase letter')
    .regex(/[a-z]/, 'Password must contain lowercase letter')
    .regex(/[0-9]/, 'Password must contain number'),
  age: z.number().int().min(13).max(120),
});

export async function registerUser(req: unknown) {
  // ✅ Validate input with Zod
  const validated = RegisterSchema.parse(req);

  // ✅ Hash password with bcrypt
  const hashedPassword = await bcrypt.hash(validated.password, 12);

  const user = await db.createUser({
    email: validated.email,
    passwordHash: hashedPassword,
    age: validated.age,
  });

  return user;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function uploadFile(file: any) {
  // ✅ Validate file type
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    throw new Error('Invalid file type');
  }

  // ✅ Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File too large');
  }

  // ✅ Sanitize filename to prevent path traversal
  const sanitizedName = path.basename(file.originalname);
  const filename = `${Date.now()}-${sanitizedName}`;

  await fs.writeFile(`/uploads/${filename}`, file.buffer);
  return { path: `/uploads/${filename}` };
}
```

---

## Test Case 5: Insecure Session Management

**File:** `src/auth/session.ts`

```typescript
import express from 'express';

// ❌ Insecure session configuration
app.use(session({
  secret: 'keyboard cat', // ❌ Weak secret
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false, // ❌ Not HTTPS-only
    httpOnly: false, // ❌ Accessible via JavaScript
    maxAge: 365 * 24 * 60 * 60 * 1000, // ❌ 1 year expiration
    sameSite: 'none', // ❌ Vulnerable to CSRF
  },
}));

// ❌ JWT with long expiration, no refresh token
export function createToken(userId: string) {
  return jwt.sign(
    { userId },
    'secret-key', // ❌ Hardcoded secret
    { expiresIn: '30d' } // ❌ 30 days is too long
  );
}

// ❌ No CSRF protection
app.post('/api/transfer-money', (req, res) => {
  const { to, amount } = req.body;
  // Transfer money without CSRF token
  transferFunds(req.user.id, to, amount);
  res.json({ success: true });
});
```

**Expected Issues:**
- ❌ **High**: Weak session secret
- ❌ **High**: Session cookies not secure (no HTTPS requirement)
- ❌ **High**: httpOnly disabled (XSS can steal session)
- ❌ **High**: Long session expiration (1 year)
- ❌ **High**: sameSite='none' enables CSRF attacks
- ❌ **High**: JWT secret hardcoded
- ❌ **Medium**: Long JWT expiration without refresh mechanism
- ❌ **High**: Missing CSRF protection on state-changing endpoint

**Recommendation:**
```typescript
import express from 'express';
import csrf from 'csurf';

// ✅ Secure session configuration
app.use(session({
  secret: process.env.SESSION_SECRET!, // ✅ From environment
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // ✅ HTTPS in production
    httpOnly: true, // ✅ Not accessible via JavaScript
    maxAge: 24 * 60 * 60 * 1000, // ✅ 24 hours
    sameSite: 'strict', // ✅ CSRF protection
  },
}));

// ✅ JWT with short expiration + refresh token pattern
export function createTokenPair(userId: string) {
  const accessToken = jwt.sign(
    { userId, type: 'access' },
    process.env.JWT_SECRET!,
    { expiresIn: '15m' } // ✅ Short-lived access token
  );

  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: '7d' } // ✅ Longer refresh token
  );

  return { accessToken, refreshToken };
}

// ✅ CSRF protection
const csrfProtection = csrf({ cookie: true });

app.post('/api/transfer-money', csrfProtection, (req, res) => {
  const { to, amount } = req.body;
  transferFunds(req.user.id, to, amount);
  res.json({ success: true });
});
```

---

## Test Case 6: Missing Authorization Checks

**File:** `src/api/posts.ts`

```typescript
// ❌ Missing authorization - any authenticated user can delete any post
app.delete('/api/posts/:id', authenticate, async (req, res) => {
  const postId = req.params.id;
  await db.deletePost(postId);
  res.json({ success: true });
});

// ❌ Client-side authorization only
app.get('/api/admin/users', authenticate, async (req, res) => {
  // ❌ No server-side check that user is admin
  const users = await db.getAllUsers();
  res.json(users);
});

// ❌ IDOR vulnerability - direct object reference without ownership check
app.get('/api/invoices/:id', authenticate, async (req, res) => {
  const invoice = await db.getInvoice(req.params.id);
  res.json(invoice); // ❌ User can access any invoice by changing ID
});
```

**Expected Issues:**
- ❌ **Critical**: Missing ownership check - users can delete others' posts
- ❌ **Critical**: Missing role check - any user can access admin endpoint
- ❌ **Critical**: IDOR vulnerability - users can access others' invoices

**Recommendation:**
```typescript
// ✅ Check ownership before allowing deletion
app.delete('/api/posts/:id', authenticate, async (req, res) => {
  const postId = req.params.id;
  const post = await db.getPost(postId);

  // ✅ Verify user owns the post
  if (post.authorId !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  await db.deletePost(postId);
  res.json({ success: true });
});

// ✅ Check admin role on server side
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

app.get('/api/admin/users', authenticate, requireAdmin, async (req, res) => {
  const users = await db.getAllUsers();
  res.json(users);
});

// ✅ Verify user can access resource
app.get('/api/invoices/:id', authenticate, async (req, res) => {
  const invoice = await db.getInvoice(req.params.id);

  // ✅ Check ownership or admin access
  if (invoice.userId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  res.json(invoice);
});
```

---

## Expected Agent Behavior

When reviewing code with these vulnerabilities, the security-sentinel agent should:

1. **Identify Each Vulnerability** with specific file and line references
2. **Assign Severity Levels**:
   - **Critical**: SQL injection, hardcoded secrets, plaintext passwords, missing auth checks
   - **High**: XSS, IDOR, insecure session config, missing input validation
   - **Medium**: Long JWT expiration, weak password requirements
   - **Low**: Missing security headers, verbose error messages
3. **Explain Risk**: What could an attacker do with this vulnerability?
4. **Provide Fix**: Concrete code example showing how to remediate
5. **Reference OWASP**: Map findings to OWASP Top 10 categories
6. **Recommend Libraries**: Suggest bcrypt, DOMPurify, Zod, csurf, etc.

---

## Success Criteria

✅ Agent catches SQL injection vulnerabilities
✅ Agent catches XSS vulnerabilities
✅ Agent catches hardcoded secrets
✅ Agent catches missing input validation
✅ Agent catches insecure session configuration
✅ Agent catches missing authorization checks
✅ Agent correctly assigns severity levels (Critical/High/Medium/Low)
✅ Agent provides specific, actionable remediation steps
✅ Agent recommends appropriate security libraries
✅ P1 issues (Critical/High) block iteration from proceeding
