'use client';

import { useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAtom, useAtomValue, useSetAtom, useStore } from 'jotai';
import { searchEntryState } from '@/store';
import { searchDraftState, searchModeState } from '@/store/SearchEntryState';
import { ragCancelState, ragModeState, ragPendingState, ragSubmissionState } from '@/store/RagConversationState';
import { buildSearchHref, decodeSearchParam, normalizeSearch, rememberSearch } from '@/lib/search';

const SEARCH_PREFIX = '/search/';

export function searchKeywordFromPath(pathname: string) {
  return pathname.startsWith(SEARCH_PREFIX) ? decodeSearchParam(pathname.slice(SEARCH_PREFIX.length)) : '';
}

/** 헤더와 하단 내비가 함께 쓰는 제자리 확장 검색의 상태와 동작 */
export default function useSearchEntry() {
  const pathname = usePathname();
  const router = useRouter();
  const store = useStore();
  const [state, setState] = useAtom(searchEntryState);
  const [mode, setMode] = useAtom(searchModeState);
  const [draft, setDraft] = useAtom(searchDraftState);
  const [submission, setSubmission] = useAtom(ragSubmissionState);
  const setRagMode = useSetAtom(ragModeState);
  const ragPending = useAtomValue(ragPendingState);
  const setCancel = useSetAtom(ragCancelState);
  const routeKeyword = searchKeywordFromPath(pathname);
  const isAskRoute = pathname === '/ask';
  const isSearchRoute = routeKeyword !== '' || isAskRoute;
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
      if (store.get(ragPendingState) || store.get(ragSubmissionState)) return false;
      if (mode !== 'keyword') {
        const question = raw.trim();
        if (question.length < 2 || question.length > 1000) return false;
        setRagMode(mode);
        setSubmission({ id: crypto.randomUUID(), question, mode });
        setDraft('');
        if (!isAskRoute) router.push('/ask');
        return true;
      }
      const keyword = normalizeSearch(raw);
      if (!keyword) return false;
      rememberSearch(keyword);
      if (keyword === routeKeyword) return true;
      setState((current) => ({ ...current, pending: keyword }));
      router.push(buildSearchHref(keyword));
      return true;
    },
    [routeKeyword, router, setState, mode, isAskRoute, store, setRagMode, setSubmission, setDraft],
  );

  return {
    expanded,
    isSearchRoute,
    routeKeyword,
    isAskRoute,
    mode,
    setMode,
    draft,
    setDraft,
    ragPending,
    stop: () => setCancel((version) => version + 1),
    pending: state.pending || (ragPending || submission ? '법안 확인' : null),
    focusToken: state.focusToken,
    openEntry,
    closeEntry,
    submit,
  };
}
