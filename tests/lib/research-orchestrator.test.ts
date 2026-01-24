import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  loadAgentPrompt,
  runResearchAgent,
  conductResearch,
  loadResearchContext,
  injectResearchContext,
} from '../../src/lib/research-orchestrator.js';
import type { Harness } from '../../src/lib/harness/types.js';

vi.mock('fs');
vi.mock('path');

describe('research-orchestrator', () => {
  const mockAgentsDir = '/mock-agents';
  const mockCwd = '/mock-project';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loadAgentPrompt', () => {
    it('should load agent prompt successfully', () => {
      vi.mocked(path.dirname).mockReturnValue('/package');
      vi.mocked(path.join).mockReturnValue('/package/agents/repo-research-analyst.md');
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        '# Repository Research Analyst\n\nYou analyze codebases.'
      );

      const prompt = loadAgentPrompt('repo-research-analyst', mockAgentsDir);
      expect(prompt).toContain('Repository Research Analyst');
    });

    it('should throw error if agent prompt not found', () => {
      vi.mocked(path.join).mockReturnValue('/nonexistent/agent.md');
      vi.mocked(fs.existsSync).mockReturnValue(false);

      expect(() => loadAgentPrompt('nonexistent-agent', mockAgentsDir)).toThrow(
        'Agent prompt not found'
      );
    });
  });

  describe('runResearchAgent', () => {
    it('should run research agent successfully', async () => {
      vi.mocked(path.join).mockReturnValue('/agents/repo-research-analyst.md');
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('# Agent Prompt\n\nInstructions.');

      const mockHarness: Harness = {
        name: 'claude',
        run: vi.fn().mockResolvedValue({
          output: '# Research Report\n\nFindings here.',
          cost: { totalCost: 0.01 },
        }),
      };

      const result = await runResearchAgent(
        mockHarness,
        'repo-research-analyst',
        'Project: Build auth system',
        mockCwd,
        mockAgentsDir
      );

      expect(result.agentName).toBe('repo-research-analyst');
      expect(result.output).toContain('Research Report');
      expect(result.error).toBeUndefined();
      expect(mockHarness.run).toHaveBeenCalledWith(
        expect.stringContaining('Agent Prompt'),
        expect.objectContaining({ cwd: mockCwd, interactive: false }),
        expect.any(Function)
      );
      expect(mockHarness.run).toHaveBeenCalledWith(
        expect.stringContaining('Project: Build auth system'),
        expect.objectContaining({ cwd: mockCwd, interactive: false }),
        expect.any(Function)
      );
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(path.join).mockReturnValue('/agents/repo-research-analyst.md');
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('# Agent');

      const mockHarness: Harness = {
        name: 'claude',
        run: vi.fn().mockRejectedValue(new Error('Harness error')),
      };

      const result = await runResearchAgent(
        mockHarness,
        'repo-research-analyst',
        'Context',
        mockCwd,
        mockAgentsDir
      );

      expect(result.agentName).toBe('repo-research-analyst');
      expect(result.output).toBe('');
      expect(result.error).toBe('Harness error');
    });
  });

  describe('conductResearch', () => {
    it('should run both research agents and save output', async () => {
      // Mock fs operations
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('# Agent Prompt');
      vi.mocked(path.join)
        .mockReturnValueOnce('/agents/repo-research-analyst.md')
        .mockReturnValueOnce('/agents/best-practices-researcher.md')
        .mockReturnValueOnce(`${mockCwd}/.ralphie/research-context.md`)
        .mockReturnValueOnce(`${mockCwd}/.ralphie`);
      vi.mocked(path.dirname).mockReturnValue(`${mockCwd}/.ralphie`);
      vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
      vi.mocked(fs.writeFileSync).mockReturnValue(undefined);

      const mockHarness: Harness = {
        name: 'claude',
        run: vi
          .fn()
          .mockResolvedValueOnce({
            output: '# Repo Analysis\n\nPatterns found.',
            cost: { totalCost: 0.01 },
          })
          .mockResolvedValueOnce({
            output: '# Best Practices\n\nRecommendations here.',
            cost: { totalCost: 0.01 },
          }),
      };

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await conductResearch(
        mockHarness,
        'Build authentication system',
        mockCwd,
        false,
        mockAgentsDir
      );

      expect(result).toContain('Research Phase Results');
      expect(result).toContain('Repository Analysis');
      expect(result).toContain('Repo Analysis');
      expect(result).toContain('Best Practices Research');
      expect(result).toContain('Best Practices');
      expect(result).toContain('Recommendations here');

      expect(consoleLogSpy).toHaveBeenCalledWith('Starting research phase...');

      consoleLogSpy.mockRestore();
    });

    it('should skip research when skipResearch is true', async () => {
      const mockHarness: Harness = {
        name: 'claude',
        run: vi.fn(),
      };

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await conductResearch(
        mockHarness,
        'Build auth',
        mockCwd,
        true,
        mockAgentsDir
      );

      expect(result).toBe('');
      expect(mockHarness.run).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Skipping research phase (--skip-research flag)'
      );

      consoleLogSpy.mockRestore();
    });

    it('should handle agent errors and continue', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('# Agent');
      vi.mocked(path.join).mockReturnValue('/agents/agent.md');
      vi.mocked(path.dirname).mockReturnValue('/mock');
      vi.mocked(fs.writeFileSync).mockReturnValue(undefined);

      const mockHarness: Harness = {
        name: 'claude',
        run: vi
          .fn()
          .mockRejectedValueOnce(new Error('Repo agent failed'))
          .mockResolvedValueOnce({
            output: '# Best Practices\n\nRecommendations.',
            cost: { totalCost: 0.01 },
          }),
      };

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await conductResearch(
        mockHarness,
        'Build auth',
        mockCwd,
        false,
        mockAgentsDir
      );

      expect(result).toContain('Research failed: Repo agent failed');
      expect(result).toContain('Best Practices');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Repository research failed: Repo agent failed'
      );

      consoleErrorSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });
  });

  describe('loadResearchContext', () => {
    it('should load research context if file exists', () => {
      vi.mocked(path.join).mockReturnValue(`${mockCwd}/.ralphie/research-context.md`);
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('# Research Results\n\nFindings.');

      const context = loadResearchContext(mockCwd);
      expect(context).toContain('Research Results');
      expect(context).toContain('Findings');
    });

    it('should return empty string if file does not exist', () => {
      vi.mocked(path.join).mockReturnValue(`${mockCwd}/.ralphie/research-context.md`);
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const context = loadResearchContext(mockCwd);
      expect(context).toBe('');
    });
  });

  describe('injectResearchContext', () => {
    it('should inject research context after first heading', () => {
      const basePrompt = `# Spec Generator

Generate a spec for the project.

## Instructions
Create tasks.`;

      const researchContext = '# Research Findings\n\nPatterns discovered.';

      const result = injectResearchContext(basePrompt, researchContext);

      expect(result).toContain('# Spec Generator');
      expect(result).toContain('## Research Findings');
      expect(result).toContain('Patterns discovered');
      expect(result).toContain('## Instructions');

      // Verify order: heading -> research -> instructions
      const specIndex = result.indexOf('# Spec Generator');
      const researchIndex = result.indexOf('## Research Findings');
      const instructionsIndex = result.indexOf('## Instructions');

      expect(specIndex).toBeLessThan(researchIndex);
      expect(researchIndex).toBeLessThan(instructionsIndex);
    });

    it('should prepend if no heading found', () => {
      const basePrompt = 'Generate a spec.';
      const researchContext = '# Research\n\nFindings.';

      const result = injectResearchContext(basePrompt, researchContext);

      expect(result.startsWith('## Research Findings')).toBe(true);
      expect(result).toContain('# Research');
      expect(result).toContain('Generate a spec');
    });

    it('should return base prompt if research context is empty', () => {
      const basePrompt = '# Spec Generator\n\nInstructions.';

      expect(injectResearchContext(basePrompt, '')).toBe(basePrompt);
      expect(injectResearchContext(basePrompt, '   ')).toBe(basePrompt);
    });
  });
});
