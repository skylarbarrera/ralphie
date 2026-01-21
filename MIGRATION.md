# Migrating to .ralphie/ Structure

Ralphie has migrated from `specs/` + `STATE.txt` to a unified `.ralphie/` directory structure. This guide helps you migrate existing projects using AI assistance.

## What Changed

### Old Structure
```
project/
├── specs/
│   ├── active/
│   ├── completed/
│   ├── templates/
│   └── lessons.md
└── STATE.txt
```

### New Structure
```
project/
└── .ralphie/
    ├── specs/
    │   ├── active/
    │   ├── completed/
    │   └── templates/
    ├── learnings/          # New: categorized learnings
    ├── state.txt           # Moved from root
    ├── llms.txt            # New: architecture decisions
    └── settings.json       # New: project settings

~/.ralphie/               # New: global config
├── learnings/            # Shared across projects
└── settings.json         # Global defaults
```

## Why This Change?

1. **Cleaner project root** - Single `.ralphie/` folder instead of scattered files
2. **Global learnings** - Share solutions across projects via `~/.ralphie/learnings/`
3. **Architecture docs** - `llms.txt` for high-level decisions
4. **Compound engineering** - Better structure for the 80/20 philosophy

## Migration Instructions

### Automated Migration (Recommended)

Ask your AI assistant to migrate your project:

```
Please migrate this project to the new .ralphie/ structure following MIGRATION.md
```

Your AI will:
1. Create `.ralphie/` directory
2. Move `specs/` → `.ralphie/specs/`
3. Move `STATE.txt` → `.ralphie/state.txt`
4. Create `.ralphie/llms.txt` template
5. Create `.ralphie/learnings/` directories
6. Update `.gitignore` if needed
7. Delete old directories after verification

### Manual Migration

If you prefer manual migration:

```bash
# 1. Create new structure
mkdir -p .ralphie/specs
mkdir -p .ralphie/learnings/{build-errors,test-failures,runtime-errors,patterns}

# 2. Move existing files
mv specs/* .ralphie/specs/
mv STATE.txt .ralphie/state.txt

# 3. Create llms.txt template
cat > .ralphie/llms.txt << 'EOF'
# Architecture Decisions

> High-level technical decisions for this project.
> Update this file when making significant architectural choices.

## Technology Stack
- Language: [e.g., TypeScript, Python]
- Framework: [e.g., React, Next.js, FastAPI]
- Database: [e.g., PostgreSQL, MongoDB]

## Key Patterns
- [Pattern name]: [Brief description and why it was chosen]

## Conventions
- [Convention]: [Brief description]

## External Dependencies
- [Service/API]: [Purpose and integration approach]
EOF

# 4. Clean up
rmdir specs  # Only works if empty

# 5. Update .gitignore if needed
echo ".ralphie/state.txt" >> .gitignore
```

### Global Directory Setup

The global `~/.ralphie/` directory is created automatically on first run. You can also initialize it manually:

```bash
mkdir -p ~/.ralphie/learnings/{build-errors,test-failures,runtime-errors,patterns}
echo '{}' > ~/.ralphie/settings.json
```

## Verification

After migration, verify the structure:

```bash
# Check directory structure
ls -la .ralphie/

# Should show:
# - specs/
# - learnings/
# - state.txt
# - llms.txt

# Test that ralphie commands work
ralphie validate  # Should find specs in new location
ralphie run       # Should run normally
```

## Backward Compatibility

Current versions of Ralphie detect the old structure and show this message:

```
⚠️  Old project structure detected (specs/ + STATE.txt in root)
    Please see MIGRATION.md for upgrade instructions.

    Quick migration: Ask your AI to "Follow MIGRATION.md to upgrade this project"
```

Ralphie will continue to work with the old structure for now, but migration is recommended.

## Troubleshooting

### "No spec found" after migration

Check that specs are in `.ralphie/specs/active/`:
```bash
ls .ralphie/specs/active/
```

### Tests failing after migration

If you have custom test scripts that reference `specs/`, update them to `.ralphie/specs/`.

### Git history

The migration preserves file history when using `git mv`:
```bash
git mv specs .ralphie/specs
git mv STATE.txt .ralphie/state.txt
```

## Benefits After Migration

1. **Cleaner workspace** - Only one hidden directory at project root
2. **Global learnings** - Solutions from one project help others
3. **Better organization** - Learnings categorized by type
4. **Architecture docs** - `llms.txt` provides context for AI agents
5. **Compound philosophy** - Structure supports 80/20 workflow

## Need Help?

Ask your AI assistant:
- "Explain the new .ralphie/ structure"
- "Help me set up llms.txt for my project"
- "Show me how to use global learnings"
