import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { useState } from 'react';
import { render } from 'ink-testing-library';
import { Text } from 'ink';
import { usePulse, type UsePulseOptions } from '../src/hooks/usePulse.js';

interface TestComponentProps {
  options?: UsePulseOptions;
  onPulseChange?: (pulse: boolean) => void;
}

function TestComponent({ options, onPulseChange }: TestComponentProps): React.ReactElement {
  const pulse = usePulse(options);
  React.useEffect(() => {
    onPulseChange?.(pulse);
  }, [pulse, onPulseChange]);
  return <Text>{pulse ? 'ON' : 'OFF'}</Text>;
}

interface ControllableTestComponentProps {
  initialOptions: UsePulseOptions;
}

function ControllableTestComponent({ initialOptions }: ControllableTestComponentProps): React.ReactElement {
  const [options, setOptions] = useState(initialOptions);
  const pulse = usePulse(options);
  return (
    <Text>
      {pulse ? 'ON' : 'OFF'}|{JSON.stringify(options)}
    </Text>
  );
}

describe('usePulse', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('default behavior', () => {
    it('returns true initially', () => {
      const { lastFrame } = render(<TestComponent />);
      expect(lastFrame()).toContain('ON');
    });

    it('toggles to OFF after default interval (500ms)', async () => {
      const { lastFrame } = render(<TestComponent />);
      expect(lastFrame()).toContain('ON');

      await vi.advanceTimersByTimeAsync(500);

      expect(lastFrame()).toContain('OFF');
    });

    it('toggles back to ON after two intervals', async () => {
      const { lastFrame } = render(<TestComponent />);

      await vi.advanceTimersByTimeAsync(500);
      expect(lastFrame()).toContain('OFF');

      await vi.advanceTimersByTimeAsync(500);
      expect(lastFrame()).toContain('ON');
    });

    it('continues toggling over multiple intervals', async () => {
      const pulseValues: boolean[] = [];
      const onPulseChange = (pulse: boolean): void => {
        pulseValues.push(pulse);
      };

      render(<TestComponent onPulseChange={onPulseChange} />);

      await vi.advanceTimersByTimeAsync(500);
      await vi.advanceTimersByTimeAsync(500);
      await vi.advanceTimersByTimeAsync(500);
      await vi.advanceTimersByTimeAsync(500);
      await vi.advanceTimersByTimeAsync(500);

      expect(pulseValues).toContain(true);
      expect(pulseValues).toContain(false);
      expect(pulseValues.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('custom interval', () => {
    it('uses custom interval when provided', async () => {
      const { lastFrame } = render(<TestComponent options={{ intervalMs: 200 }} />);
      expect(lastFrame()).toContain('ON');

      await vi.advanceTimersByTimeAsync(100);
      expect(lastFrame()).toContain('ON');

      await vi.advanceTimersByTimeAsync(100);
      expect(lastFrame()).toContain('OFF');
    });

    it('toggles faster with shorter interval', async () => {
      const pulseValues: boolean[] = [];
      const onPulseChange = (pulse: boolean): void => {
        pulseValues.push(pulse);
      };

      render(<TestComponent options={{ intervalMs: 100 }} onPulseChange={onPulseChange} />);

      for (let i = 0; i < 5; i++) {
        await vi.advanceTimersByTimeAsync(100);
      }

      expect(pulseValues.length).toBeGreaterThanOrEqual(5);
    });

    it('toggles slower with longer interval', async () => {
      const { lastFrame } = render(<TestComponent options={{ intervalMs: 1000 }} />);
      expect(lastFrame()).toContain('ON');

      await vi.advanceTimersByTimeAsync(500);
      expect(lastFrame()).toContain('ON');

      await vi.advanceTimersByTimeAsync(500);
      expect(lastFrame()).toContain('OFF');
    });
  });

  describe('enabled option', () => {
    it('is enabled by default', async () => {
      const { lastFrame } = render(<TestComponent />);
      expect(lastFrame()).toContain('ON');

      await vi.advanceTimersByTimeAsync(500);
      expect(lastFrame()).toContain('OFF');
    });

    it('does not toggle when disabled', async () => {
      const { lastFrame } = render(<TestComponent options={{ enabled: false }} />);
      expect(lastFrame()).toContain('ON');

      await vi.advanceTimersByTimeAsync(1000);
      expect(lastFrame()).toContain('ON');

      await vi.advanceTimersByTimeAsync(2000);
      expect(lastFrame()).toContain('ON');
    });

    it('stays at ON when disabled from start', async () => {
      const pulseValues: boolean[] = [];
      const onPulseChange = (pulse: boolean): void => {
        pulseValues.push(pulse);
      };

      render(<TestComponent options={{ enabled: false }} onPulseChange={onPulseChange} />);

      await vi.advanceTimersByTimeAsync(2000);

      const allOn = pulseValues.every((v) => v === true);
      expect(allOn).toBe(true);
    });
  });

  describe('cleanup', () => {
    it('stops toggling after unmount', async () => {
      const pulseValues: boolean[] = [];
      const onPulseChange = (pulse: boolean): void => {
        pulseValues.push(pulse);
      };

      const { unmount } = render(<TestComponent onPulseChange={onPulseChange} />);

      await vi.advanceTimersByTimeAsync(500);
      const countBeforeUnmount = pulseValues.length;

      unmount();

      await vi.advanceTimersByTimeAsync(2000);
      expect(pulseValues.length).toBe(countBeforeUnmount);
    });
  });

  describe('empty options', () => {
    it('works with no options provided', async () => {
      const { lastFrame } = render(<TestComponent />);
      expect(lastFrame()).toContain('ON');

      await vi.advanceTimersByTimeAsync(500);
      expect(lastFrame()).toContain('OFF');
    });

    it('works with empty options object', async () => {
      const { lastFrame } = render(<TestComponent options={{}} />);
      expect(lastFrame()).toContain('ON');

      await vi.advanceTimersByTimeAsync(500);
      expect(lastFrame()).toContain('OFF');
    });
  });

  describe('exports', () => {
    it('exports usePulse function', async () => {
      const { usePulse: hook } = await import('../src/hooks/usePulse.js');
      expect(typeof hook).toBe('function');
    });

    it('exports UsePulseOptions type', async () => {
      const module = await import('../src/hooks/usePulse.js');
      expect(module.usePulse).toBeDefined();
    });
  });
});
