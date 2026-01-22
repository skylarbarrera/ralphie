# Plan: Update spec generation to include quality requirements

## Goal
Inject senior engineer code quality standards into generated specs so deliverables explicitly require tests, security measures, and architectural boundaries.

## Task ID
T008

## Files to Modify
- `src/lib/spec-generator.ts` - Update the prompt template to include quality requirements

## Implementation Approach

1. **Update spec generation prompt** in `spec-generator.ts`:
   - Add quality standards template to the deliverables section
   - Include mandatory requirements: testing, security, architecture
   - Provide concrete examples in the prompt
   - Reference the code quality standards doc

2. **Quality injection format**:
   - Each deliverable should include:
     - **Tests**: What test coverage is required (unit, integration)
     - **Security**: Specific security considerations for the task
     - **Architecture**: Module boundaries and separation of concerns
   - Use bullet points in deliverables to make requirements explicit

3. **Example format for generated specs**:
   ```markdown
   **Deliverables:**
   - Auth service with JWT validation
     - MUST use bcrypt for password hashing (cost factor 12+)
     - MUST include unit tests (>80% coverage)
     - MUST separate auth logic from route handlers
     - MUST validate all inputs with Zod schema
   ```

## Tests
- Generate a test spec using `generateSpec()` function
- Verify the generated spec includes quality requirements in deliverables:
  - Test requirements mentioned
  - Security considerations specified
  - Architecture boundaries noted
  - Tool recommendations with rationale

## Exit Criteria
- ✅ Spec generation prompt includes quality injection template
- ✅ Generated specs have explicit quality requirements in deliverables
- ✅ Requirements cover tests, security, and architecture
- ✅ Example demonstrates the format clearly
- ✅ Manual verification shows quality requirements present
