import { useState, useEffect, useRef } from 'react';

export interface UsePulseOptions {
  intervalMs?: number;
  enabled?: boolean;
}

const DEFAULT_INTERVAL_MS = 500;

export function usePulse(options: UsePulseOptions = {}): boolean {
  const { intervalMs = DEFAULT_INTERVAL_MS, enabled = true } = options;

  const [pulse, setPulse] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setPulse(true);
      return;
    }

    intervalRef.current = setInterval(() => {
      setPulse((prev) => !prev);
    }, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [intervalMs, enabled]);

  return pulse;
}
