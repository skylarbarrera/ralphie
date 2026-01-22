# Plan: T005 - Add security checks to validation

**Goal:** Add comprehensive security checks to the validation review process

**Task ID:** T005

**Files to create/modify:**
- Check if `agents/security-reviewer.md` exists, create/update it
- Update iteration prompt to include security checklist
- Update review orchestration to include security checks

**Tests:**
- Create test cases with intentional security vulnerabilities
- Verify security review catches:
  - SQL injection vectors
  - XSS vectors
  - Secrets in code
  - Missing input validation
  - Insecure defaults

**Exit criteria:**
- Security review agent exists with comprehensive checks
- Iteration prompt includes security guidance
- Test with intentional vulnerabilities passes (review catches them)
- Task status updated to `passed`
- Changes committed
