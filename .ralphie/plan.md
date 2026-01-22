# Plan: Create example showcase

## Goal
Demonstrate Ralphie's ability to generate senior engineer-level code across different stacks by creating 3 working example projects with quality explanations.

## Task ID
T010

## Files to Create
- `examples/typescript-express-api/` - TypeScript/Express REST API example
- `examples/python-fastapi-service/` - Python/FastAPI service example
- `examples/react-component-library/` - React component library example
- `examples/README.md` - Overview of examples and quality principles

## Implementation Approach

1. **Create examples directory structure**:
   ```
   examples/
   ├── README.md (overview)
   ├── typescript-express-api/
   │   ├── README.md (quality explanation)
   │   ├── src/ (generated code)
   │   └── tests/ (generated tests)
   ├── python-fastapi-service/
   │   ├── README.md (quality explanation)
   │   ├── app/ (generated code)
   │   └── tests/ (generated tests)
   └── react-component-library/
       ├── README.md (quality explanation)
       ├── src/ (generated code)
       └── tests/ (generated tests)
   ```

2. **TypeScript/Express API Example**:
   - Feature: User authentication with JWT
   - Demonstrates: Zod validation, bcrypt passwords, separation of concerns (routes/services/models)
   - Quality highlights: typed interfaces, >80% test coverage, parameterized queries

3. **Python/FastAPI Service Example**:
   - Feature: Data validation service
   - Demonstrates: Pydantic models, type hints, pytest tests
   - Quality highlights: FastAPI best practices, async/await, comprehensive error handling

4. **React Component Library Example**:
   - Feature: Reusable form components
   - Demonstrates: TypeScript, proper component composition, accessibility
   - Quality highlights: typed props, comprehensive tests, Storybook integration

5. **Each README explains**:
   - What makes this code "senior engineer quality"
   - Tool choices and rationale
   - Architecture patterns used
   - Security considerations
   - Test coverage approach

## Tests
Manual verification:
- Each example project builds successfully
- Tests pass with >80% coverage
- Code follows patterns from docs/code-quality-standards.md
- READMEs clearly explain quality attributes

## Exit Criteria
- ✅ Examples directory created with 3 working projects
- ✅ Each project has comprehensive README explaining quality
- ✅ TypeScript/Express example demonstrates best practices
- ✅ Python/FastAPI example demonstrates best practices
- ✅ React component library example demonstrates best practices
- ✅ All examples can be built and tested successfully
- ✅ Main examples/README.md ties everything together
