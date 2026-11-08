'use client';

import { useMemo, useOptimistic, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/**
 * 같은 화면에서 쿼리 문자열만 바꾸는 이동(탭·정렬·필터)에 쓴다.
 * 이런 이동은 서버가 화면을 다시 그리는 동안 loading.tsx가 뜨지 않아 이전 목록이 그대로 멈춰 보인다.
 * `params`는 누른 값을 바로 반영한 쿼리이고, `pending`은 서버 응답을 기다리는 동안 true다.
 */
export function useSearchParamsTransition() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useOptimistic(searchParams.toString());
  const params = useMemo(() => new URLSearchParams(query), [query]);

  const push = (next: URLSearchParams) => {
    const nextQuery = next.toString();
    startTransition(() => {
      setQuery(nextQuery);
      router.push(`${pathname}${nextQuery ? `?${nextQuery}` : ''}`, { scroll: false });
    });
  };

  return { params, pending, push };
}
