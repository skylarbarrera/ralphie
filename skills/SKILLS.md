---
name: ralphie-skills
description: Ralphie core skills - spec generation, validation, and iteration
license: MIT
---

# Ralphie Skills

## Available Skills

### Spec Generation

#### ralphie-spec
Generate project specifications through structured user interviews.
- **Install**: `npx add-skill skillet/ralph --skill ralphie-spec`
- **Use**: Run `/ralphie-spec` in Claude Code when user is present

#### review-spec
Validate spec format and content quality.
- **Install**: `npx add-skill skillet/ralph --skill review-spec`
- **Use**: Run `/review-spec` after generating a spec for quality review

### Project Management

#### verify
Pre-commit verification skill that auto-detects project tooling and runs appropriate checks.
- **Install**: `npx add-skill skillet/ralph --skill verify`
- **Use**: During ralphie iterations to validate code before committing

#### ralphie-iterate
Execute autonomous coding iterations following Ralphie protocol.
- **Install**: `npx add-skill skillet/ralph --skill ralphie-iterate`
- **Use**: To implement tasks from spec files in `specs/active/`

## Installation

```bash
# Install all Ralphie skills
npx add-skill skillet/ralph

# Install specific skill
npx add-skill skillet/ralph --skill ralphie-spec
```

## Usage

### CLI Usage
```bash
# Autonomous spec generation via CLI:
ralphie spec "Build a REST API for user management"

# Run implementation iterations:
ralphie run --all
```

### Direct Skill Invocation
```bash
# In Claude Code, Codex, or OpenCode:
/ralphie-spec "Build a REST API"    # Interactive with user
/review-spec                        # Review existing spec
```

## Cross-Platform Support

All skills are designed to be:
- **Self-contained** - No local CLI dependencies required
- **Universal** - Work across Claude Code, Codex, OpenCode
- **Standard** - Use only common tools (Read, Write, Edit, Glob, Grep, Bash)
- **Distributable** - Installable via `npx add-skill`
