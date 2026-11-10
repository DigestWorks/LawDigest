'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useSetAtom } from 'jotai';
import { searchEntryState } from '@/store';
import { searchDraftState } from '@/store/SearchEntryState';
import { searchKeywordFromPath } from './useSearchEntry';

/** 경로가 바뀔 때 검색 확장 상태를 맞추고, `/`·⌘K 단축키로 검색을 연다. */
export default function SearchEntrySync() {
  const pathname = usePathname();
  const setState = useSetAtom(searchEntryState);
  const setDraft = useSetAtom(searchDraftState);

  useEffect(() => {
    // 기다리던 검색어의 결과 경로에 도착했을 때만 검색 중 표시를 남긴다.
    // 뒤로 가기나 다른 링크로 벗어나면 결과가 도착하지 않으므로 지운다.
    const routeKeyword = searchKeywordFromPath(pathname);
    if (routeKeyword) setDraft(routeKeyword);
    setState((current) => ({
      ...current,
      open: 'auto',
      pending: current.pending !== null && current.pending === routeKeyword ? current.pending : null,
    }));
  }, [pathname, setState, setDraft]);

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.closest('input, textarea, select, [contenteditable="true"]')) return;
      const slash = event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey;
      const commandK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
      if (!slash && !commandK) return;
      event.preventDefault();
      setState((current) => ({ ...current, open: true, focusToken: current.focusToken + 1 }));
    };
    document.addEventListener('keydown', shortcut);
    return () => document.removeEventListener('keydown', shortcut);
  }, [setState]);

  return null;
}
