'use client';

import { useEffect, useRef } from 'react';

/** 목록 DOM이 준비된 뒤 해당 필터에서 마지막으로 읽던 위치를 복원한다. */
export function useListScrollRestoration(key: string, ready: boolean) {
  const previousKey = useRef<string | null>(null);
  const historyNavigation = useRef(false);
  useEffect(() => {
    const onPopState = () => {
      historyNavigation.current = true;
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
  useEffect(() => {
    if (!ready) return undefined;
    const restore = previousKey.current === null || historyNavigation.current;
    previousKey.current = key;
    historyNavigation.current = false;
    const storageKey = `lawdigest:list-scroll:${key}`;
    let saved = 0;
    try {
      saved = restore ? Number(window.sessionStorage.getItem(storageKey)) || 0 : 0;
    } catch {
      /* 저장 제한 시 기본 스크롤 동작을 유지한다. */
    }
    let position = window.scrollY;
    let restoring = true;
    let leaving = false;
    let secondFrame: number | undefined;
    const remember = () => {
      if (restoring || leaving) return;
      position = window.scrollY;
      try {
        window.sessionStorage.setItem(storageKey, String(position));
      } catch {
        /* 탐색은 계속한다. */
      }
    };
    const onLinkClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === '_blank' || anchor.hasAttribute('download'))
        return;
      const destination = new URL(anchor.href, window.location.href);
      if (
        destination.origin !== window.location.origin ||
        destination.pathname + destination.search === window.location.pathname + window.location.search
      )
        return;
      // App Router가 새 화면을 위해 scrollY를 0으로 바꾸기 전에 저장한다.
      remember();
      leaving = true;
    };
    const frame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        if (saved > 0 && window.scrollY === 0) window.scrollTo(0, saved);
        restoring = false;
        remember();
      });
    });
    window.addEventListener('scroll', remember, { passive: true });
    document.addEventListener('click', onLinkClick, true);
    return () => {
      cancelAnimationFrame(frame);
      if (secondFrame !== undefined) cancelAnimationFrame(secondFrame);
      window.removeEventListener('scroll', remember);
      document.removeEventListener('click', onLinkClick, true);
      if (!restoring) {
        try {
          window.sessionStorage.setItem(storageKey, String(position));
        } catch {
          /* 저장은 선택 사항이다. */
        }
      }
    };
  }, [key, ready]);
}
