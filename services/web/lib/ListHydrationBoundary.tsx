'use client';

import { DehydratedState, HydrationBoundary, useQueryClient } from '@tanstack/react-query';

/** 서버의 첫 페이지가 탐색 중 쌓은 클라이언트 페이지를 덮어쓰지 않게 한다. */
export default function ListHydrationBoundary({
  state,
  children,
}: {
  state: DehydratedState;
  children: React.ReactNode;
}) {
  const client = useQueryClient();
  const queries = state.queries.filter((query) => {
    const cached = client.getQueryState(query.queryKey)?.data;
    return !(
      cached &&
      typeof cached === 'object' &&
      'pages' in cached &&
      Array.isArray(cached.pages) &&
      cached.pages.length > 1
    );
  });
  return <HydrationBoundary state={{ ...state, queries }}>{children}</HydrationBoundary>;
}
