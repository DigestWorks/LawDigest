'use client';

import { useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAtom } from 'jotai';
import { searchEntryState } from '@/store';
import { searchDraftState } from '@/store/SearchEntryState';
import { buildSearchHref, decodeSearchParam, normalizeSearch, rememberSearch } from '@/lib/search';

const SEARCH_PREFIX = '/search/';

export function searchKeywordFromPath(pathname: string) {
  return pathname.startsWith(SEARCH_PREFIX) ? decodeSearchParam(pathname.slice(SEARCH_PREFIX.length)) : '';
}

/** 헤더와 하단 내비가 함께 쓰는 제자리 확장 검색의 상태와 동작.
 * 검색어는 검색 결과 화면으로 가고, 그 화면 맨 위에서 같은 검색어로 AI 답변이 시작된다. */
export default function useSearchEntry() {
  const pathname = usePathname();
  const router = useRouter();
  const [state, setState] = useAtom(searchEntryState);
  const [draft, setDraft] = useAtom(searchDraftState);
  const routeKeyword = searchKeywordFromPath(pathname);
  const isSearchRoute = routeKeyword !== '';
  // 검색 결과 화면에서는 검색창을 접지 않는다.
  const expanded = isSearchRoute || state.open === true;

  const openEntry = useCallback(
    () => setState((current) => ({ ...current, open: true, focusToken: current.focusToken + 1 })),
    [setState],
  );
  const closeEntry = useCallback(() => setState((current) => ({ ...current, open: false })), [setState]);

  /** 검색어를 기록하고 결과 경로로 이동한다. 빈 검색어면 false를 돌려준다. */
  const submit = useCallback(
    (raw: string) => {
      const keyword = normalizeSearch(raw);
      if (!keyword) return false;
      rememberSearch(keyword);
      if (keyword === routeKeyword) return true;
      setState((current) => ({ ...current, open: 'auto', pending: keyword }));
      router.push(buildSearchHref(keyword));
      return true;
    },
    [routeKeyword, router, setState],
  );

  return {
    expanded,
    isSearchRoute,
    routeKeyword,
    draft,
    setDraft,
    pending: state.pending,
    focusToken: state.focusToken,
    openEntry,
    closeEntry,
    submit,
  };
}
