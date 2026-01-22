# Ralphie Compound Engineering - Improvement Plan

**Context:** New compound engineering features (research, learnings, review) are documented but largely untested. User hasn't tried the new workflow yet. Need to validate everything works before using in production.

## Phase 1: Critical Validation (MUST DO FIRST)

**Goal:** Prove core features actually work. Without this, we have vaporware.

### 1.1 Test Learnings System End-to-End
**Why critical:** Core value prop. If this doesn't work, compound engineering is hollow.

**Tasks:**
- [ ] Create test project, trigger intentional failure (e.g., bad import)
- [ ] Fix the failure manually
- [ ] Verify learning is captured in `.ralphie/learnings/`
- [ ] Verify learning has correct format (YAML frontmatter)
- [ ] Run another iteration, verify learning is injected
- [ ] Test global learnings (`~/.ralphie/learnings/`)

**Success criteria:**
- Learnings appear in correct directory
- YAML format is valid
- Future iterations reference the learning
- Same mistake doesn't repeat

**Effort:** 2-3 hours
**Priority:** P0 (blocking)

### 1.2 Validate Research Quality
**Why critical:** Adds 60-90s and tokens. If output is garbage, it's worse than useless.

**Tasks:**
- [ ] Run research on Ralphie codebase itself
- [ ] Review `research-context.md` output
- [ ] Check: Does repo-research find actual patterns? (TypeScript, testing, structure)
- [ ] Check: Does best-practices find relevant info?
- [ ] Generate spec with vs without research
- [ ] Compare spec quality (does research improve it?)

**Success criteria:**
- Research finds ≥5 real codebase patterns
- Research-informed spec mentions existing conventions
- Blind A/B test shows research-based spec is better

**Effort:** 1-2 hours
**Priority:** P0 (blocking)

### 1.3 Test Multi-Agent Review
**Why critical:** Documented feature, never tested. Might not work at all.

**Tasks:**
- [ ] Create test spec with intentional security issue (e.g., SQL injection)
- [ ] Run `ralphie run --review`
- [ ] Verify security agent catches the issue
- [ ] Verify it blocks with P1 finding
- [ ] Test `--force` override
- [ ] Create spec with performance issue (N+1 query)
- [ ] Verify performance agent catches it

**Success criteria:**
- Review agents actually run
- Security issues are flagged
- P1 blocks execution
- `--force` allows override

**Effort:** 2 hours
**Priority:** P0 (blocking)

### 1.4 Find All Path Migration Bugs
**Why critical:** We found 6 during testing. Likely more lurking.

**Tasks:**
- [ ] Search codebase: `grep -r "specs/active" src/`
- [ ] Search codebase: `grep -r "\.ai/ralphie" src/`
- [ ] Search codebase: `grep -r "specs/completed" src/`
- [ ] Check agent prompts for old paths
- [ ] Check error messages for old paths
- [ ] Add test that fails if old paths exist in code

**Success criteria:**
- Zero references to old paths in code
- Test prevents regression

**Effort:** 1 hour
**Priority:** P0 (blocking)

---

## Phase 2: Reliability Improvements (HIGH PRIORITY)

**Goal:** Make the system robust enough to trust.

### 2.1 Better Error Messages
**Current:** `Error: Spec was not created at specs/active/...`
**Problem:** Doesn't help user understand what went wrong

**Tasks:**
- [ ] Audit all error messages
- [ ] Add hints for common issues:
  - Old path references → suggest new structure
  - Missing .ralphie/ → suggest `ralphie init`
  - Missing API key → suggest export command
- [ ] Add error codes for debugging

**Success criteria:**
- Every error has actionable hint
- User can fix issue without reading code

**Effort:** 2 hours
**Priority:** P1

### 2.2 Research Agent Reliability
**Current:** 90s timeout, sometimes hits it, partial output capture

**Tasks:**
- [ ] Make timeout configurable: `--research-timeout 120`
- [ ] Add research progress indicator (spinner or dots)
- [ ] Test with large codebase (>1000 files)
- [ ] Test with empty codebase (new project)
- [ ] Better agent instructions for consistency

**Success criteria:**
- Research completes 95% of the time
- User sees progress during research
- Partial output is coherent

**Effort:** 3 hours
**Priority:** P1

### 2.3 Validation Command
**Current:** `ralphie validate` checks spec format only

**Tasks:**
- [ ] Add `--strict` mode that checks:
  - No old path references in codebase
  - .ralphie/ structure exists
  - Learnings directory is writable
  - Research agents are accessible
- [ ] Add health check for research agents
- [ ] Test on fresh install

**Success criteria:**
- `ralphie validate --strict` catches setup issues
- Runs on CI/CD to prevent regressions

**Effort:** 2 hours
**Priority:** P1

---

## Phase 3: User Experience (MEDIUM PRIORITY)

**Goal:** Make it clear what's happening and why.

### 3.1 Research Output Visibility
**Current:** Silent, writes to file, user has no idea what happened

**Tasks:**
- [ ] Show research summary after completion:
  ```
  ✓ Repo research (42s): Found 8 patterns
    - TypeScript strict mode
    - Jest for testing
    - Express routing
  ✓ Best practices (38s): Found 5 recommendations
    - Use Zod for validation
    - Avoid N+1 queries
  ```
- [ ] Add `--verbose` flag for full research output
- [ ] Add `ralphie research-show` to view last research

**Success criteria:**
- User knows research ran
- User sees high-level findings
- Can inspect details if needed

**Effort:** 3 hours
**Priority:** P2

### 3.2 Token Usage Display
**Current:** User has no idea what they're spending

**Tasks:**
- [ ] Track tokens per phase (research, spec gen, analysis, iteration)
- [ ] Display after completion:
  ```
  Token usage:
    Research: 45k (~$0.23)
    Spec gen: 12k (~$0.06)
    Analysis: 8k (~$0.04)
    Total: 65k (~$0.33)
  ```
- [ ] Add `--dry-run` to estimate without running
- [ ] Add `--budget 0.50` to cap spending

**Success criteria:**
- User knows cost after each run
- Can estimate before running
- Can set spending limits

**Effort:** 4 hours
**Priority:** P2

### 3.3 Learnings Management
**Current:** Learnings are captured but invisible

**Tasks:**
- [ ] Add `ralphie learnings list`
- [ ] Add `ralphie learnings search "keyword"`
- [ ] Add `ralphie learnings show <id>`
- [ ] Show learnings count in status:
  ```
  Status: 3 tasks (2 passed, 1 pending)
  Learnings: 12 captured (8 local, 4 global)
  ```

**Success criteria:**
- User can view captured learnings
- Can search for relevant ones
- Visibility into compound effect

**Effort:** 3 hours
**Priority:** P2

---

## Phase 4: Flexibility & Control (NICE TO HAVE)

**Goal:** Power users can tune the system.

### 4.1 Configurable Research Depth
**Tasks:**
- [ ] `--research-quick` (30s, repo only)
- [ ] `--research-deep` (120s, repo + practices + examples)
- [ ] `--research-repo-only` (skip external research)
- [ ] Default depth based on codebase size

**Effort:** 4 hours
**Priority:** P3

### 4.2 Model Selection
**Tasks:**
- [ ] `--research-model haiku` (fast, cheap)
- [ ] `--research-model opus` (deep, expensive)
- [ ] Cost estimates for each model

**Effort:** 2 hours
**Priority:** P3

### 4.3 Research Caching
**Tasks:**
- [ ] Cache repo research for 1 hour
- [ ] Invalidate on git changes
- [ ] `--no-cache` to force refresh

**Effort:** 3 hours
**Priority:** P3

---

## Phase 5: Comprehensive Testing Suite

**Goal:** Prevent regressions, document expected behavior.

### 5.1 Integration Tests
**Tasks:**
- [ ] Test: Empty project → research → spec → run
- [ ] Test: Existing project → research finds patterns
- [ ] Test: Failure → fix → learning captured → injection
- [ ] Test: Review blocks on P1 issue
- [ ] Test: Review allows on P2 issue
- [ ] Test: Greedy mode with research
- [ ] Test: Headless mode with all features

**Effort:** 8 hours
**Priority:** P1

### 5.2 Benchmark Tests
**Tasks:**
- [ ] Measure research quality: with vs without
- [ ] Measure learnings impact: session 1 vs session 10
- [ ] Measure review effectiveness: issues caught
- [ ] Document baseline metrics

**Effort:** 4 hours
**Priority:** P2

---

## Implementation Roadmap

### Week 1: Validation Sprint
- [ ] Phase 1.1: Test learnings system (3h)
- [ ] Phase 1.2: Validate research quality (2h)
- [ ] Phase 1.3: Test multi-agent review (2h)
- [ ] Phase 1.4: Find all path bugs (1h)

**Total: 8 hours**
**Deliverable:** Proof that core features work

### Week 2: Reliability Sprint
- [ ] Phase 2.1: Better error messages (2h)
- [ ] Phase 2.2: Research agent reliability (3h)
- [ ] Phase 2.3: Validation command (2h)
- [ ] Phase 5.1: Integration tests (8h)

**Total: 15 hours**
**Deliverable:** Stable, tested system

### Week 3: UX Sprint
- [ ] Phase 3.1: Research output visibility (3h)
- [ ] Phase 3.2: Token usage display (4h)
- [ ] Phase 3.3: Learnings management (3h)

**Total: 10 hours**
**Deliverable:** User-friendly system

### Week 4: Polish (Optional)
- [ ] Phase 4.1: Configurable research (4h)
- [ ] Phase 4.2: Model selection (2h)
- [ ] Phase 5.2: Benchmark tests (4h)

**Total: 10 hours**
**Deliverable:** Production-ready

---

## Decision Points

After each phase, decide:

**After Week 1 (Validation):**
- ✅ If learnings work → continue
- ❌ If learnings broken → fix before proceeding
- ✅ If research helps → keep it
- ❌ If research doesn't help → make optional/remove

**After Week 2 (Reliability):**
- ✅ If tests pass → ship beta
- ❌ If tests fail → fix before UX work

**After Week 3 (UX):**
- Ship v1.0 or continue to Week 4?

---

## Quick Wins (Can Do Today)

These require minimal effort but provide value:

1. **Add progress indicator to research** (30 min)
   ```typescript
   console.log('Running research...');
   ```

2. **Fix known path bugs** (1 hour)
   - Global search/replace
   - Add test to prevent regression

3. **Add research summary output** (1 hour)
   ```typescript
   console.log(`✓ Research complete: Found ${patterns.length} patterns`);
   ```

4. **Add token counter** (2 hours)
   - Track per phase
   - Display total at end

**Total: 4.5 hours**
**Impact: Immediate usability improvement**

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Learnings don't actually work | High - core feature broken | Test in Week 1, fix before proceeding |
| Research quality is poor | High - wasted time/cost | Validate in Week 1, make optional if bad |
| Review agents are slow | Medium - UX issue | Make async, add timeout |
| Token costs too high | Medium - user adoption | Add budget controls, dry-run mode |
| Path bugs everywhere | High - broken for users | Complete audit in Week 1 |

---

## Success Metrics

After full implementation:

- [ ] Learnings system works: 100% capture rate on failure→pass
- [ ] Research improves specs: >60% preference in blind test
- [ ] Review catches issues: >80% of injected bugs found
- [ ] Path bugs: 0 remaining in codebase
- [ ] Test coverage: >80% for compound features
- [ ] User can estimate cost before running
- [ ] User can see what research found
- [ ] System is self-improving (learnings compound)

---

## Next Steps

1. **Review this plan** - Adjust priorities, timeline
2. **Choose starting point:**
   - Quick wins today?
   - Start Week 1 validation?
   - Focus on specific phase?
3. **Decide on deliverable:**
   - Proof of concept (Phase 1 only)?
   - Beta release (Phase 1-2)?
   - Full v1.0 (Phase 1-3)?
