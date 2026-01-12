# Ralph v3.1 - Reduce Template Duplication

Address duplication and bloat issues from v3 integration by establishing clear separation of concerns between ralph.md (Ralph intro + coding standards) and SKILL.md (iteration protocol).

## Problem Statement
1. **ralph.md is bloated** - Contains both coding standards AND full iteration protocol details (~830 lines)
2. **Duplication** - SKILL.md and ralph.md both describe the iteration protocol
3. **Sync burden** - Skill exists in two places (.claude/skills/ and templates/.claude/skills/)

## Solution Architecture

```
templates/.claude/
├── ralph.md              # Ralph intro + Coding standards (~350 lines)
│                         # - What is Ralph (brief)
│                         # - Required reading (SPEC, STATE, index)
│                         # - "For iteration protocol, use /ralph-iterate"
│                         # - Language preferences
│                         # - Code style, testing, architecture
│                         # - Git commit standards
│                         # - Security, dependencies
│                         # - Anti-patterns, tools, principles
│
├── skills/
│   └── ralph-iterate/
│       └── SKILL.md      # Full iteration protocol (~900 lines)
│                         # - Claude Code Native Features overview
│                         # - Creating SPECs (AskUserQuestion)
│                         # - Load context, explore, plan
│                         # - Implement, review, commit
│                         # - Hooks configuration
│
└── settings.json.example # Hook configuration
```

**Key principle:** ralph.md = "what is Ralph + how to write good code", SKILL.md = "how to run an iteration"

## Phase 1: Refactor ralph.md

- [x] Keep "Ralph-Specific Guidelines" header with brief intro explaining what Ralph is
- [x] Keep "Required Reading" section (SPEC, STATE, index.md)
- [x] Add pointer: "For iteration protocol, use /ralph-iterate skill"
- [x] Remove "Claude Code Native Features" section (move to SKILL.md)
- [x] Remove "Creating SPECs (Interactive)" section (move to SKILL.md)
- [x] Remove "Writing SPECs" section (move to SKILL.md)
- [x] Remove "Memory System" section (already in SKILL.md)
- [x] Remove "Task Completion Criteria" section (in SKILL.md)
- [x] Remove "Code Review Protocol" section (in SKILL.md)
- [x] Remove "Sub-Task Tracking Protocol" section (in SKILL.md)
- [x] Remove "Progress Updates" section (in SKILL.md)
- [x] Remove "Error Recovery" section (in SKILL.md)
- [x] Remove "Hooks Configuration" section (in SKILL.md)
- [x] Keep all coding standards sections (Language, Style, Testing, Architecture, Git, Performance, Security, Dependencies, Anti-Patterns, Tools, Principles)

## Phase 2: Enhance SKILL.md

- [ ] Add "Claude Code Native Features" overview after the frontmatter
- [ ] Add "Creating SPECs" section with full AskUserQuestion protocol
- [ ] Add "Writing SPECs" section with batching guidance
- [ ] Add "Hooks Configuration" section
- [ ] Add brief reference: "Follow coding standards in ralph.md"
- [ ] Verify SKILL.md is self-contained for running iterations

## Phase 3: Single Source of Truth

- [ ] Delete .claude/skills/ directory from project (templates is authoritative)
- [ ] Sync .claude/CLAUDE.md with the new lean ralph.md

## Phase 4: Validation

- [ ] Verify ralph.md is ~350 lines (down from ~830)
- [ ] Verify SKILL.md contains all iteration + SPEC creation guidance
- [ ] Run tests to ensure no regressions
- [ ] Test ralph init creates correct structure

## Success Criteria
- ralph.md has brief Ralph intro + coding standards only (~350 lines)
- SKILL.md is the single source for iteration protocol and SPEC creation
- No duplication between files
- Clear separation: intro+standards vs protocol
- Templates directory is the authoritative source for skill
