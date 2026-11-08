'use client';

import { useEffect, useMemo, useOptimistic, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { SKELETON_APPEAR_DELAY_MS, SKELETON_MIN_VISIBLE_MS } from '@/components/common/Skeletons/useSkeletonGate';

// 응답이 PENDING_DELAY_MS 안에 오면 스켈레톤 없이 이전 목록에서 새 목록으로 바로 바꾼다.
// 스켈레톤을 띄웠다면 응답이 곧바로 와도 PENDING_MIN_MS 동안은 유지해 번쩍이지 않게 한다.
const PENDING_DELAY_MS = SKELETON_APPEAR_DELAY_MS;
const PENDING_MIN_MS = SKELETON_MIN_VISIBLE_MS;

/**
 * 같은 화면에서 쿼리 문자열만 바꾸는 이동(탭·정렬·필터)에 쓴다.
 * 이런 이동은 서버가 화면을 다시 그리는 동안 loading.tsx가 뜨지 않아 이전 목록이 그대로 멈춰 보인다.
 * `params`는 누른 값을 바로 반영한 쿼리다.
 * `pending`은 응답이 PENDING_DELAY_MS보다 늦을 때 true가 되고, 한 번 true가 되면 최소 PENDING_MIN_MS 동안 유지된다.
 */
export function useSearchParamsTransition() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [waiting, startTransition] = useTransition();
  const [shownAt, setShownAt] = useState<number | null>(null);
  const [query, setQuery] = useOptimistic(searchParams.toString());
  const params = useMemo(() => new URLSearchParams(query), [query]);

  useEffect(() => {
    if (waiting && shownAt === null) {
      const timer = window.setTimeout(() => setShownAt(performance.now()), PENDING_DELAY_MS);
      return () => window.clearTimeout(timer);
    }
    if (!waiting && shownAt !== null) {
      const remaining = Math.max(0, PENDING_MIN_MS - (performance.now() - shownAt));
      const timer = window.setTimeout(() => setShownAt(null), remaining);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [waiting, shownAt]);

  const push = (next: URLSearchParams) => {
    const nextQuery = next.toString();
    startTransition(() => {
      setQuery(nextQuery);
      router.push(`${pathname}${nextQuery ? `?${nextQuery}` : ''}`, { scroll: false });
    });
  };

  return { params, pending: shownAt !== null, push };
}
