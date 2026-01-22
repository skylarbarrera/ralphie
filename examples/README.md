# Ralphie Code Quality Examples

This directory showcases senior engineer-level code that Ralphie aims to generate. Each example demonstrates the quality standards documented in [`docs/code-quality-standards.md`](../docs/code-quality-standards.md).

## Examples

### 1. [TypeScript/Express API](./typescript-express-api/)
**Feature**: User authentication with JWT

**Demonstrates**:
- ✅ Zod for input validation (not manual checks)
- ✅ bcrypt for password hashing (cost factor 12)
- ✅ Separation of concerns (routes → services → models)
- ✅ Typed interfaces between layers
- ✅ Parameterized queries (SQL injection prevention)
- ✅ >80% test coverage

### 2. [Python/FastAPI Service](./python-fastapi-service/)
**Feature**: Data validation service

**Demonstrates**:
- ✅ Pydantic models for validation
- ✅ Type hints throughout
- ✅ Async/await patterns
- ✅ pytest with comprehensive tests
- ✅ FastAPI best practices
- ✅ Proper error handling

### 3. [React Component Library](./react-component-library/)
**Feature**: Reusable form components

**Demonstrates**:
- ✅ TypeScript with strict mode
- ✅ Typed props and interfaces
- ✅ Component composition patterns
- ✅ Accessibility (ARIA labels, keyboard nav)
- ✅ Comprehensive unit tests
- ✅ Documentation with examples

## What Makes These Examples "Senior Engineer Quality"?

### 1. Best-in-Class Tools
Every example uses established, well-maintained libraries instead of manual implementations:
- **Validation**: Zod (TypeScript), Pydantic (Python) — not regex or manual checks
- **Auth**: bcrypt for passwords, JWT for tokens — not homebrew crypto
- **Testing**: Vitest/Jest, Pytest — comprehensive test coverage

### 2. Clean Architecture
Code is organized into clear layers with single responsibilities:
```
routes/     → Handle HTTP concerns (request/response)
services/   → Contain business logic
models/     → Handle data access
```

### 3. Type Safety
- TypeScript interfaces define contracts between modules
- Python type hints document expected types
- No `any` types or unchecked data

### 4. Security by Default
- Input validation at boundaries (Zod, Pydantic)
- Parameterized queries (no SQL injection)
- Hashed passwords (bcrypt)
- HTTPS, httpOnly cookies, CSRF protection

### 5. Comprehensive Testing
- Unit tests for business logic
- Integration tests for API endpoints
- >80% code coverage
- Tests for error cases, not just happy paths

### 6. Production Ready
- Proper error handling
- Logging and observability
- Documentation (README, API docs)
- Environment configuration

## Using These Examples

Each example includes:
- `README.md` - Detailed explanation of quality attributes
- `src/` or `app/` - Implementation code
- `tests/` - Test suite
- `package.json` or `requirements.txt` - Dependencies

You can use these as:
1. **Reference implementations** when building similar features
2. **Learning materials** to understand quality patterns
3. **Templates** for new projects
4. **Comparison benchmarks** to evaluate generated code

## Related Documentation

- [Code Quality Standards](../docs/code-quality-standards.md) - Complete quality guidelines
- [Security Sentinel Agent](../agents/security-sentinel.md) - Security review checklist
- [Architecture Strategist Agent](../agents/architecture-strategist.md) - Architecture patterns
- [Test Validator Agent](../agents/test-validator.md) - Test coverage requirements

## Philosophy

These examples embody Ralphie's 80/20 philosophy:
- **80% Planning**: Research best tools, understand patterns, plan architecture
- **20% Execution**: Write code that follows established best practices

Quality code isn't about being clever—it's about using the right tools, following proven patterns, and ensuring maintainability.
