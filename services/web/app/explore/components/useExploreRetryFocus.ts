import { useEffect, useRef } from 'react';
import type { MouseEvent } from 'react';

export function useExploreRetryFocus(ready: boolean, refetch: () => Promise<{ isSuccess: boolean }>) {
  const resultRef = useRef<HTMLDivElement>(null);
  const retryTrigger = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const trigger = retryTrigger.current;
    if (!ready || !trigger) return;

    retryTrigger.current = null;
    const focused = document.activeElement;
    if (focused === document.body || focused === trigger) resultRef.current?.focus();
  }, [ready]);

  function retry(event: MouseEvent<HTMLButtonElement>) {
    const trigger = event.detail === 0 ? event.currentTarget : null;
    retryTrigger.current = trigger;
    void refetch().then(({ isSuccess }) => {
      if (!isSuccess && retryTrigger.current === trigger) retryTrigger.current = null;
    });
  }

  return { resultRef, retry };
}
