/**
 * Prompt template for learning capture after failed→passed task
 */

/**
 * Generate instructions for AI to document a learning after fixing a failed task
 */
export function generateLearningCaptureInstructions(
  taskId: string,
  taskTitle: string,
  learningFilePath: string
): string {
  return `
## 🎓 Learning Capture Required

The previous iteration failed on task ${taskId}, but you've now fixed it! Please document this learning to help prevent similar issues in the future.

**Task:** ${taskTitle}
**Learning file:** ${learningFilePath}

### Instructions

1. **Update the learning file** at \`${learningFilePath}\` with:
   - **Root cause:** What was the actual problem?
   - **Solution:** What fixed it?
   - **Prevention:** How can we prevent this in the future?

2. **Add a test** that would catch this bug:
   - Write a test that fails with the original bug
   - Verify it passes with your fix
   - Add it to the appropriate test file

3. **Suggest a rule** for \`.claude/ralphie.md\`:
   - What coding guideline would prevent this?
   - Keep it specific and actionable

### Example Learning Format

\`\`\`yaml
---
problem: Task ${taskId} (${taskTitle}) failed initially
symptoms: [what you observed]
root-cause: [what actually caused the failure]
solution: [what fixed it]
prevention: [how to prevent it]
tags: [${taskId.toLowerCase()}, relevant-tags]
category: build-errors
date: ${new Date().toISOString().split('T')[0]}
---

## Context
[Brief explanation of the task and what went wrong]

## Resolution
[Detailed explanation of the fix]

## Test Added
\`\`\`typescript
// Path: tests/...
describe('${taskTitle}', () => {
  it('should prevent the bug from ${taskId}', () => {
    // Test implementation
  });
});
\`\`\`

## Rule Suggestion
Add to \`.claude/ralphie.md\`:
\`\`\`markdown
- [Your suggested rule here]
\`\`\`
\`\`\`

**Turn failures into upgrades!** This learning will help both you and other developers working on this codebase.
`;
}
