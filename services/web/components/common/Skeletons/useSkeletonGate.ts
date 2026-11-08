'use client';

import { useEffect, useLayoutEffect, useState } from 'react';

// tailwind.config.js `skeleton`·`skeleton-region` 애니메이션의 등장 지연과 같은 값이다.
export const SKELETON_APPEAR_DELAY_MS = 300;
export const SKELETON_MIN_VISIBLE_MS = 400;

/**
 * 스켈레톤을 보일지 정한다. 로딩 중이면 true다.
 * 로딩이 등장 지연보다 짧으면 스켈레톤은 투명한 채로 끝나므로 바로 내용을 보인다.
 * 로딩이 길어 스켈레톤이 나타났다면, 자료가 곧바로 와도 최소 SKELETON_MIN_VISIBLE_MS 동안 스켈레톤을 유지해 번쩍이지 않게 한다.
 */
export function useSkeletonGate(loading: boolean) {
  const [since, setSince] = useState<number | null>(null);
  const [holdUntil, setHoldUntil] = useState<number | null>(null);

  // 시작 시각은 스켈레톤이 실제로 화면에 붙는 순간에 잰다. 라우트 전환은 새 화면을 미리 렌더링해 두었다가 붙이므로
  // 렌더 시각으로 재면 스켈레톤이 이미 충분히 보였다고 잘못 판단한다. CSS 등장 지연도 화면에 붙은 순간부터 흐른다.
  useLayoutEffect(() => {
    if (loading) setSince((current) => current ?? performance.now());
  }, [loading]);

  // 로딩 종료는 렌더 중 상태 갱신으로 같은 렌더에서 반영한다. 끝난 순간 내용이 한 프레임 보였다가 다시 가려지는 것을 막는다.
  if (!loading && since !== null) {
    const now = performance.now();
    const end = since + SKELETON_APPEAR_DELAY_MS + SKELETON_MIN_VISIBLE_MS;
    setSince(null);
    if (now - since > SKELETON_APPEAR_DELAY_MS && now < end) setHoldUntil(end);
  }

  useEffect(() => {
    if (holdUntil === null) return undefined;
    const timer = window.setTimeout(() => setHoldUntil(null), Math.max(0, holdUntil - performance.now()));
    return () => window.clearTimeout(timer);
  }, [holdUntil]);

  return loading || holdUntil !== null;
}
