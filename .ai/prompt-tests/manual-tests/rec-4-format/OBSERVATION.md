# Format Enforcement Observation

**Test:** Greenfield CLI tool spec
**Result:** 24 code blocks, review failed 3x

## The Real Question

Is the LLM wrong, or are our format requirements too strict?

### What the LLM Produces

- Full TypeScript interfaces
- Detailed file structure diagram
- CLI usage documentation
- package.json examples
- Error handling tables
- Manifest JSON examples

### What We Said We Want

- No code blocks outside Verify sections
- Plain text deliverables only
- Minimal implementation details

### But Which Is More Useful?

| Format We Want | What LLM Produces |
|----------------|-------------------|
| "Define User interface" | Full TypeScript interface with comments |
| "Create project structure" | Complete file tree diagram |
| "Add CLI commands" | Full usage documentation |

**The LLM's SPEC is MORE actionable.** An implementer (human or AI) can directly use the TypeScript interfaces, understand the exact file structure, and reference the CLI docs.

## The Tradeoff

**Our format:**
- Cleaner, more abstract
- Requires implementer to make more decisions
- Faster to generate

**LLM's format:**
- More detailed, more useful
- Reduces ambiguity during implementation
- Takes longer to generate

## Hypothesis

The review keeps failing because we're penalizing **useful** information. The LLM is correctly producing comprehensive specs - we just labeled them "wrong."

## Questions to Consider

1. Do we actually want minimal SPECs, or do we want comprehensive design docs?
2. If code blocks are useful (and they are), should we allow them in specific sections?
3. Is "code outside Verify sections = violation" the right rule?

## Possible Resolution

Instead of "NO CODE EVER", maybe:
- Allow code in designated sections: `## Types`, `## File Structure`
- Only penalize code in task deliverables directly
- Or: Accept that detailed SPECs are better and adjust scoring
