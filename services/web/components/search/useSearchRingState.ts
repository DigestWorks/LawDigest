'use client';

import { useEffect, useRef, useState } from 'react';

/** 회전 층이 서서히 사라지는 시간(globals.css의 .search-spinner와 같다) */
const SETTLE_MS = 600;

/**
 * 검색창 무지개 테두리의 상태.
 * 검색이 끝나면 바로 멈추지 않고, 회전을 이어 가며 흐려지는 'settling'을 거쳐 'rest'로 간다.
 */
export default function useSearchRingState(pending: boolean) {
  const [settling, setSettling] = useState(false);
  const wasPending = useRef(pending);

  useEffect(() => {
    const ended = wasPending.current && !pending;
    wasPending.current = pending;
    if (!ended) {
      setSettling(false);
      return undefined;
    }
    setSettling(true);
    const timer = setTimeout(() => setSettling(false), SETTLE_MS);
    return () => clearTimeout(timer);
  }, [pending]);

  if (pending) return 'pending';
  return settling ? 'settling' : 'rest';
}
