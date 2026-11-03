import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { expect, it, vi } from 'vitest';
import { billDetailQueryOptions, usePatchBookmark } from './queries';

const { patch } = vi.hoisted(() => ({ patch: vi.fn() }));
vi.mock('./apis', () => ({ postBookmark: patch }));

it('서버가 확인한 스크랩만 상세와 목록 캐시에 반영한다', async () => {
  const client = new QueryClient();
  const billId = 'fixture-bill';
  const publicKey = billDetailQueryOptions(billId).queryKey;
  const detailKey = billDetailQueryOptions(billId, true).queryKey;
  const savedList = ['/user/bookmarking/bill'];
  const followingList = ['/following-tab/bill'];
  const publicBill = { data: { is_book_mark: false, bill_info_dto: { bill_like_count: 9 } } };
  const privateBill = { data: { is_book_mark: true, bill_info_dto: { bill_like_count: 9 } } };
  client.setQueryData(publicKey, publicBill);
  client.setQueryData(detailKey, privateBill);
  client.setQueryData(savedList, []);
  client.setQueryData(followingList, []);
  patch
    .mockRejectedValueOnce(new Error('503'))
    .mockResolvedValueOnce({ data: { like_checked: true } })
    .mockResolvedValueOnce({ data: { like_checked: false } });

  const { result } = renderHook(() => usePatchBookmark(billId), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
  await act(async () => {
    await expect(result.current.mutateAsync(false)).rejects.toThrow('503');
    await expect(result.current.mutateAsync(false)).rejects.toThrow('스크랩 상태를 확인하지 못했습니다.');
  });
  expect(client.getQueryData(detailKey)).toEqual(privateBill);
  expect(client.getQueryState(savedList)?.isInvalidated).toBe(false);
  expect(client.getQueryState(followingList)?.isInvalidated).toBe(false);

  await act(async () => {
    await expect(result.current.mutateAsync(false)).resolves.toBe(false);
  });
  expect(client.getQueryData(publicKey)).toEqual(publicBill);
  expect(client.getQueryData(detailKey)).toMatchObject({
    data: { is_book_mark: false, bill_info_dto: { bill_like_count: 8 } },
  });
  expect(client.getQueryState(savedList)?.isInvalidated).toBe(true);
  expect(client.getQueryState(followingList)?.isInvalidated).toBe(true);
});
