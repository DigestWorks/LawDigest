import { render } from '@testing-library/react';
import { dehydrate, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import ListHydrationBoundary from './ListHydrationBoundary';

describe('목록 서버 데이터 병합', () => {
  it('뒤로 가기에서 새 서버 첫 페이지가 이미 읽은 여러 페이지를 지우지 않는다', () => {
    const client = new QueryClient();
    const server = new QueryClient();
    const key = ['feed', '정부이송'];
    const loaded = { pages: ['첫 페이지', '두 번째 페이지'], pageParams: [0, 1] };
    client.setQueryData(key, loaded, { updatedAt: 1 });
    server.setQueryData(key, { pages: ['새 첫 페이지'], pageParams: [0] });
    render(
      <QueryClientProvider client={client}>
        <ListHydrationBoundary state={dehydrate(server)}>목록</ListHydrationBoundary>
      </QueryClientProvider>,
    );
    expect(client.getQueryData(key)).toEqual(loaded);
  });

  it('첫 방문의 서버 페이지와 다른 조건의 데이터는 전달한다', () => {
    const client = new QueryClient();
    const server = new QueryClient();
    const key = ['feed', '접수'];
    const initial = { pages: ['첫 페이지'], pageParams: [0] };
    server.setQueryData(key, initial);
    render(
      <QueryClientProvider client={client}>
        <ListHydrationBoundary state={dehydrate(server)}>목록</ListHydrationBoundary>
      </QueryClientProvider>,
    );
    expect(client.getQueryData(key)).toEqual(initial);
  });
});
