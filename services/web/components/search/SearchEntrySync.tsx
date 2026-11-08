'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useSetAtom } from 'jotai';
import { searchEntryState } from '@/store';
import { searchKeywordFromPath } from './useSearchEntry';

/** 경로가 바뀔 때 검색 확장 상태를 맞추고, `/`·⌘K 단축키로 검색을 연다. */
export default function SearchEntrySync() {
  const pathname = usePathname();
  const setState = useSetAtom(searchEntryState);

  useEffect(() => {
    const onSearchRoute = searchKeywordFromPath(pathname) !== '';
    setState((current) => ({ ...current, open: 'auto', pending: onSearchRoute ? current.pending : null }));
  }, [pathname, setState]);

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
