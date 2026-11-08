'use client';

import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTrendingKeywords } from '@/app/explore/apis/apis';
import { readRecentSearches, saveRecentSearches } from '@/lib/search';
import { useRagStatus } from '@/hooks/useRagConversation';

/** 펼친 검색창 아래에 보여 줄 최근 검색어, 인기 키워드, 질의응답 가능 여부 */
export default function useSearchSuggestions(enabled: boolean, trendingSize = 8) {
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => {
    if (enabled) setRecent(readRecentSearches());
  }, [enabled]);

  const trending = useQuery({
    queryKey: ['/bill/trending-keywords', trendingSize],
    queryFn: () => getTrendingKeywords(trendingSize),
    enabled,
    staleTime: 5 * 60_000,
  });
  const rag = useRagStatus(22, enabled);

  const updateRecent = useCallback((values: string[]) => {
    setRecent(values);
    saveRecentSearches(values);
  }, []);
  const removeRecent = useCallback(
    (keyword: string) => updateRecent(readRecentSearches().filter((value) => value !== keyword)),
    [updateRecent],
  );
  const clearRecent = useCallback(() => updateRecent([]), [updateRecent]);
  /** 하단 내비처럼 경로가 바뀌어도 남아 있는 화면은 입력에 포커스할 때 다시 읽는다. */
  const refreshRecent = useCallback(() => setRecent(readRecentSearches()), []);

  return {
    recent,
    trending: trending.data?.data ?? [],
    ragAvailable: Boolean(rag.data?.available),
    removeRecent,
    clearRecent,
    refreshRecent,
  };
}
