# Plan: T008 - Create agent prompt library

## Goal
Create agent prompt library with 8 adapted prompts from Compound Engineering for research, review, and validation.

## Task ID
T008

## Files
- `agents/repo-research-analyst.md` (create)
- `agents/best-practices-researcher.md` (create)
- `agents/security-sentinel.md` (create)
- `agents/performance-oracle.md` (create)
- `agents/architecture-strategist.md` (create)
- `agents/typescript-reviewer.md` (create)
- `agents/python-reviewer.md` (create)
- `agents/spec-flow-analyzer.md` (create)
- `agents/SOURCE.md` (create - documents source and adaptations)
- `agents/README.md` (create - explains agent system)

## Tests
- Manual verification: `ls agents/` shows all 8 agent .md files plus SOURCE.md
- Verify each agent has clear structure with invocation instructions and expected output format
- Verify SOURCE.md has mapping table and update instructions

## Exit Criteria
- ✅ 8 agent prompt files exist in agents/ directory
- ✅ SOURCE.md exists with complete mapping and adaptation notes
- ✅ README.md explains the agent system and how Ralphie uses them
- ✅ Each agent prompt follows consistent structure
- ✅ Verify command passes: `ls agents/` shows 8 agent .md files
