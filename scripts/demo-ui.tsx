#!/usr/bin/env npx tsx
import React from 'react';
import { render } from 'ink';
import { App } from '../src/App.js';
import type { HarnessStreamState } from '../src/hooks/useHarnessStream.js';

const mockState: HarnessStreamState = {
  phase: 'reading',
  taskText: 'Implementing user authentication with JWT tokens',
  activeTools: [
    { id: '1', name: 'Read', category: 'read', startTime: Date.now(), input: { file_path: 'src/auth.ts' } },
  ],
  toolGroups: [],
  stats: {
    toolsStarted: 5,
    toolsCompleted: 4,
    toolsErrored: 0,
    reads: 3,
    writes: 1,
    commands: 1,
    metaOps: 0,
  },
  elapsedMs: 45000,
  result: null,
  error: null,
  isRunning: true,
  activityLog: [
    { type: 'thought', text: 'I need to implement JWT authentication for the user service...', timestamp: Date.now() - 30000 },
    { type: 'tool_start', toolUseId: 't1', toolName: 'Read', displayName: 'src/models/user.ts', timestamp: Date.now() - 25000 },
    { type: 'tool_complete', toolUseId: 't1', toolName: 'Read', displayName: 'src/models/user.ts', durationMs: 120, isError: false, timestamp: Date.now() - 24880 },
    { type: 'tool_start', toolUseId: 't2', toolName: 'Write', displayName: 'src/auth/jwt.ts', timestamp: Date.now() - 20000 },
    { type: 'tool_complete', toolUseId: 't2', toolName: 'Write', displayName: 'src/auth/jwt.ts', durationMs: 450, isError: false, timestamp: Date.now() - 19550 },
    { type: 'tool_start', toolUseId: 't3', toolName: 'Bash', displayName: 'npm test', timestamp: Date.now() - 15000 },
    { type: 'tool_complete', toolUseId: 't3', toolName: 'Bash', displayName: 'npm test', durationMs: 3200, isError: false, timestamp: Date.now() - 11800 },
    { type: 'commit', hash: 'a1b2c3d', message: 'Add JWT token generation and validation', timestamp: Date.now() - 10000 },
    { type: 'tool_start', toolUseId: 't4', toolName: 'Read', displayName: 'src/auth.ts', timestamp: Date.now() - 5000 },
  ],
  lastCommit: { hash: 'a1b2c3d', message: 'Add JWT token generation and validation' },
};

const { unmount } = render(
  <App
    prompt="Demo"
    iteration={3}
    totalIterations={5}
    _mockState={mockState}
    taskNumber="3"
    phaseName="Auth"
    specTaskText="Implement JWT authentication"
    completedResults={[
      {
        iteration: 1,
        durationMs: 62000,
        stats: { toolsStarted: 8, toolsCompleted: 8, toolsErrored: 0, reads: 4, writes: 3, commands: 1, metaOps: 0 },
        error: null,
        taskText: 'Claude thinks this is task 1',
        specTaskText: 'Set up project structure with TypeScript',
        lastCommit: { hash: 'f8e9d0c', message: 'Initialize project with TypeScript config' },
        costUsd: 0.12,
        usage: { inputTokens: 15000, outputTokens: 3000 },
        taskNumber: '1',
        phaseName: 'Setup',
        failureContext: null,
      },
      {
        iteration: 2,
        durationMs: 45000,
        stats: { toolsStarted: 6, toolsCompleted: 6, toolsErrored: 0, reads: 3, writes: 2, commands: 1, metaOps: 0 },
        error: null,
        taskText: 'Claude thinks this is task 2',
        specTaskText: 'Create User model with validation',
        lastCommit: { hash: 'a2b3c4d', message: 'Add User model with email validation' },
        costUsd: 0.08,
        usage: { inputTokens: 12000, outputTokens: 2500 },
        taskNumber: '2',
        phaseName: 'Setup',
        failureContext: null,
      },
    ]}
  />
);

setTimeout(() => {
  unmount();
  process.exit(0);
}, 5000);

console.log('\n  Press Ctrl+C to exit (auto-exits in 5s)\n');
