'use client';

import { useLayoutEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { SKELETON_APPEAR_DELAY_MS } from './useSkeletonGate';

// 라우트 스켈레톤이 섹션 스켈레톤으로 바뀌는 것처럼 스켈레톤이 이어질 때 등장 지연을 다시 걸면 한 번 꺼졌다 켜진다.
// 앞 스켈레톤이 실제로 보이고 있었을 때만 이어받는 스켈레톤을 지연 없이 바로 보인다.
// 앞 스켈레톤이 아직 투명했다면 이어받는 스켈레톤도 지연을 거쳐 짧은 로딩에서 보이지 않게 한다.
const HANDOFF_MS = 200;
// 나타나기 시작한 직후에는 거의 투명하다(ease-in). 이 시간 이상 보였을 때만 "보였다"고 본다.
const SEEN_MS = 100;
const activeRegions = new Set<{ visibleFrom: number }>();
let lastVisibleHiddenAt = Number.NEGATIVE_INFINITY;

function isHandoff(now: number) {
  if (now - lastVisibleHiddenAt < HANDOFF_MS) return true;
  return [...activeRegions].some(({ visibleFrom }) => now - visibleFrom >= SEEN_MS);
}

/** 스켈레톤 묶음을 화면 읽기 프로그램에 한 번만 알린다. 블록은 모두 aria-hidden이다. */
export default function LoadingRegion({
  label,
  className,
  children,
  instant = false,
  as: Tag = 'div',
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
  /** 호출한 쪽이 이미 기다린 뒤 띄우는 스켈레톤이면 등장 지연을 건너뛴다. */
  instant?: boolean;
  as?: 'div' | 'section' | 'li';
}) {
  const ref = useRef<HTMLElement>(null);

  // 화면에 붙는 순간(그리기 전)에 이어받기를 판단한다. 라우트 전환은 새 화면을 미리 렌더링하므로 렌더 시점에는 앞 스켈레톤이
  // 보였는지 알 수 없다. 속성을 DOM에 직접 달아 서버 HTML과 하이드레이션 결과를 바꾸지 않는다.
  useLayoutEffect(() => {
    const now = performance.now();
    const handoff = isHandoff(now);
    if (handoff) ref.current?.setAttribute('data-skeleton-instant', '');
    const entry = { visibleFrom: now + (instant || handoff ? 0 : SKELETON_APPEAR_DELAY_MS) };
    activeRegions.add(entry);
    return () => {
      activeRegions.delete(entry);
      if (performance.now() - entry.visibleFrom >= SEEN_MS) lastVisibleHiddenAt = performance.now();
    };
  }, []);

  return (
    <Tag
      ref={ref as React.Ref<never>}
      role="status"
      aria-busy="true"
      data-skeleton-instant={instant ? '' : undefined}
      className={cn('w-full animate-skeleton-region motion-reduce:animate-skeleton-static', className)}>
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="contents">
        {children}
      </div>
    </Tag>
  );
}
