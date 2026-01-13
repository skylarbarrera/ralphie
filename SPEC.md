# Ralph v0.3 - Headless Mode for Factory Integration

Add headless mode to enable programmatic integration with Factory orchestrator and other automation tools.

## Current State (v0.2.0)

Ralph is a working CLI that:
- Spawns `claude` CLI with `--output-format stream-json`
- Parses Claude's native stream-json output via `StreamParser`
- Tracks iteration state via `StateMachine` (phases: idle, reading, editing, running, thinking, done)
- Has Ink-based terminal UI components (IterationHeader, TaskTitle, ToolList, StatusBar)
- Tracks stats (reads, writes, commands, meta ops)
- Logs raw output to `./runs/{timestamp}.jsonl`
- Runs N iterations or until SPEC is complete

**CLI:**
```bash
ralph run           # 1 iteration
ralph run -n 10     # 10 iterations
ralph run --all     # until SPEC complete (max 100)
```

---

## What Factory Needs from Ralph

The Factory worker needs to:
1. Run Ralph headlessly (no interactive Ink UI)
2. Get structured output for orchestrator heartbeats
3. Know when tasks complete, files change, commits happen
4. Get exit status (success/stuck/failed)

---

## Phase 1: Add Headless Flag

- [x] Add `--headless` flag to CLI in `src/cli.tsx`
- [x] When headless, skip Ink render, use JSON event emitter to stdout
- [x] Create `src/lib/headless-emitter.ts` with event types

### Event Emitter

```typescript
// src/lib/headless-emitter.ts

export type RalphEvent =
  | { event: 'started'; spec: string; tasks: number; timestamp: string }
  | { event: 'iteration'; n: number; phase: string }
  | { event: 'tool'; type: 'read' | 'write' | 'bash'; path?: string }
  | { event: 'commit'; hash: string; message: string }
  | { event: 'task_complete'; index: number; text: string }
  | { event: 'iteration_done'; n: number; duration_ms: number; stats: Stats }
  | { event: 'stuck'; reason: string; iterations_without_progress: number }
  | { event: 'complete'; tasks_done: number; total_duration_ms: number }
  | { event: 'failed'; error: string };

export function emit(event: RalphEvent): void {
  console.log(JSON.stringify(event));
}
```

## Phase 2: Headless Runner

- [ ] Create `src/lib/headless-runner.ts`
- [ ] Re-use existing `StreamParser` and `StateMachine`
- [ ] Emit events instead of updating Ink UI
- [ ] Wire up in CLI when `--headless` is passed

```typescript
// src/lib/headless-runner.ts

export async function executeHeadlessRun(options: RunOptions): Promise<void> {
  const spec = loadSpec(options.cwd);
  emit({ event: 'started', spec: 'SPEC.md', tasks: spec.tasks.length, timestamp: new Date().toISOString() });

  let iterationsWithoutProgress = 0;

  for (let i = 1; i <= options.iterations; i++) {
    const tasksBefore = countCompleteTasks(spec);

    emit({ event: 'iteration', n: i, phase: 'starting' });

    const result = await runSingleIteration(options);

    // Forward tool events from StateMachine
    // result.toolGroups.forEach(group => emit tool events)

    const updatedSpec = loadSpec(options.cwd);
    const tasksAfter = countCompleteTasks(updatedSpec);

    if (tasksAfter > tasksBefore) {
      iterationsWithoutProgress = 0;
      // Emit task_complete for each newly completed task
    } else {
      iterationsWithoutProgress++;
    }

    emit({ event: 'iteration_done', n: i, duration_ms: result.durationMs, stats: result.stats });

    if (iterationsWithoutProgress >= options.stuckThreshold) {
      emit({ event: 'stuck', reason: 'No task progress', iterations_without_progress: iterationsWithoutProgress });
      process.exit(1);
    }

    if (isSpecComplete(updatedSpec)) {
      emit({ event: 'complete', tasks_done: tasksAfter, total_duration_ms: totalDuration });
      process.exit(0);
    }
  }

  process.exit(2); // Max iterations reached
}
```

## Phase 3: Stuck Detection

- [ ] Add `--stuck-threshold <n>` CLI option (default 3)
- [ ] Track consecutive iterations without task completion
- [ ] Emit `stuck` event and exit 1 when threshold exceeded

## Phase 4: Exit Codes

- [ ] Exit 0 = All tasks complete
- [ ] Exit 1 = Stuck (no progress after threshold)
- [ ] Exit 2 = Max iterations reached
- [ ] Exit 3 = Fatal error

## Phase 5: Tests

- [ ] Unit tests for `headless-emitter.ts`
- [ ] Unit tests for `headless-runner.ts`
- [ ] Integration test: headless run with mock SPEC
- [ ] Integration test: stuck detection triggers correctly

---

## CLI Changes Summary

```typescript
// In src/cli.tsx

program
  .command('run')
  .option('--headless', 'Output JSON events instead of UI')
  .option('--stuck-threshold <n>', 'Iterations without progress before stuck', '3')
  .action((options) => {
    if (options.headless) {
      executeHeadlessRun(options);
    } else {
      executeRun(options);  // existing Ink UI
    }
  });
```

---

## Success Criteria

- `ralph run --headless` outputs JSONL events to stdout (no Ink UI)
- Events include: started, iteration, tool, commit, task_complete, iteration_done, stuck, complete, failed
- Exit codes are deterministic and documented
- Stuck detection works with configurable threshold
- All existing tests pass
- New tests cover headless mode
