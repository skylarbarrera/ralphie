# Config Validation

**Goal:** Add validation for .ralphie/settings.json and ~/.ralphie/settings.json files to ensure proper configuration structure.

## Context

Ralphie loads settings from .ralphie/settings.json (project-level) and ~/.ralphie/settings.json (global). Currently there's no validation to ensure these files have the correct structure. Users might add invalid configuration that causes runtime errors.

Target: Schema validation that catches configuration errors early with helpful error messages.

## Tasks

### T001: Add config validation with schema
- Status: pending
- Size: M

**Deliverables:**
- Validation function that checks settings.json structure
- Schema definition for valid configuration
- Clear error messages for invalid config
- Unit tests for validation logic
- Integration with config-loader.ts

**Verify:** `npm test -- config-validation`

**Notes:** Should validate:
- `harness` field (optional string: 'claude-code' | 'aider' | 'cursor')
- `mcpServers` field (optional object with server configs)
- `customPricing` field (optional object with model pricing)
- Any unexpected fields should be flagged

---

## Acceptance Criteria

**When complete:**
- ✅ Invalid config files are rejected with clear error messages
- ✅ Valid config files pass validation
- ✅ Schema is maintainable and easy to extend
- ✅ Tests cover valid and invalid cases
- ✅ No runtime errors from malformed configs
