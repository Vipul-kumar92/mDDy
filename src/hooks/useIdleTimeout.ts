import { useEffect, useRef } from 'react';

const THIRTY_MINUTES_MS = 30 * 60 * 1000;

/**
 * Log the user out after a period of inactivity (Requirements 1.7, 1.8).
 * Resets the timer on common user-activity events. Only active while `enabled`.
 */
export function useIdleTimeout(
  onIdle: () => void,
  enabled: boolean,
  timeoutMs: number = THIRTY_MINUTES_MS,
): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onIdleRef = useRef(onIdle);
  onIdleRef.current = onIdle;

  useEffect(() => {
    if (!enabled) return;

    const reset = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onIdleRef.current(), timeoutMs);
    };

    const events: (keyof WindowEventMap)[] = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'scroll',
      'click',
    ];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [enabled, timeoutMs]);
}
