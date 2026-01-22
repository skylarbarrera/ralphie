# Plan: T003 - Add Architecture Quality Checks to Review Agents

## Goal
Enhance architecture-strategist agent to enforce senior engineer architecture standards including validation library usage.

## Task ID
T003

## Files
- Modify: `agents/architecture-strategist.md` (add quality checks)
- Create: `tests/agents/architecture-strategist.test.md` (test cases for validation)

## Approach

Based on the T001 audit findings, we need to enhance the architecture review agent to catch:

1. **Separation of Concerns**
   - Business logic vs presentation vs data
   - One responsibility per module
   - Clear module boundaries

2. **Interface Definitions**
   - Typed contracts between modules
   - Exported interfaces with JSDoc
   - Proper use of TypeScript types

3. **Dependency Direction**
   - High-level → low-level (not circular)
   - Core logic doesn't depend on presentation
   - Data layer at bottom

4. **Module Boundaries**
   - Clear imports/exports
   - No reaching into internals
   - Proper encapsulation

5. **Validation Library Usage** (from audit)
   - Flag manual JSON.parse without schema validation
   - Recommend Zod for TypeScript projects
   - Recommend Pydantic for Python projects
   - Flag type assertions without runtime validation

6. **Error Handling Consistency** (from audit)
   - Check for consistent error patterns
   - Flag mix of throw/return null/undefined
   - Recommend Result types or consistent strategy

## Enhancement Strategy

Update `architecture-strategist.md` to add:

1. **New section: "Validation & Parsing"**
   - Check for manual JSON.parse → flag, recommend Zod
   - Check for YAML.load with type assertion → flag, recommend schema
   - Check for manual validation logic → suggest library alternative

2. **New section: "Error Handling Patterns"**
   - Identify error handling patterns in codebase
   - Flag inconsistencies (throw vs null vs undefined)
   - Recommend standardization

3. **Enhanced severity levels**
   - P1 (CRITICAL): Circular dependencies, no separation of concerns
   - P2 (HIGH): Manual validation without schema, inconsistent error handling
   - P3 (MEDIUM): Missing JSDoc, unclear module boundaries

## Tests

Create test document with intentional violations:
- Manual JSON.parse without validation
- Circular dependencies
- Business logic in presentation layer
- Mixed error handling patterns

Verify agent catches these issues and recommends fixes.

## Exit Criteria
- [x] Architecture agent updated with validation checks
- [x] Architecture agent updated with error handling checks
- [x] Test cases documented
- [x] Agent catches manual JSON.parse and recommends Zod
- [x] Agent catches inconsistent error handling
- [x] Task status updated to `passed`
- [x] Changes committed
