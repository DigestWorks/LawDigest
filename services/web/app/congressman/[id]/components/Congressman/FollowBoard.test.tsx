import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore, Provider } from 'jotai';
import { expect, it, vi } from 'vitest';
import { snackbarState } from '@/store';
import PartyFollowBoard from '@/app/party/[id]/components/PartyDetail/FollowBoard';
import CongressmanFollowBoard from './FollowBoard';

const { patchCongressman, patchParty } = vi.hoisted(() => ({ patchCongressman: vi.fn(), patchParty: vi.fn() }));

vi.mock('cookies-next', () => ({ getCookie: () => 'isolated-test-cookie' }));
vi.mock('../../apis/apis', () => ({ patchCongressmanFollow: patchCongressman }));
vi.mock('@/app/party/[id]/apis/api', () => ({ patchPartyFollow: patchParty }));

const cases = [
  {
    subject: '의원',
    board: (
      <CongressmanFollowBoard id="C001" likeChecked={false} follow_count={9} represent_count={10} public_count={11} />
    ),
    actionName: '팔로우 하기',
    patch: patchCongressman,
    response: { data: { like_checked: true } },
    detailKey: ['/congressman/detail', 'C001'],
    statusField: 'like_checked',
    savedKey: ['/user/liking/congressman'],
    extraKeys: [['/following-tab/congressman'], ['/following-tab/bill']],
  },
  {
    subject: '정당',
    board: (
      <PartyFollowBoard
        id={7}
        followed={false}
        follow_count={9}
        representative_bill_count={10}
        public_bill_count={11}
      />
    ),
    actionName: '팔로우',
    patch: patchParty,
    response: { data: { follow_checked: true } },
    detailKey: ['/party/detail', 7],
    statusField: 'followed',
    savedKey: ['/user/following/party'],
    extraKeys: [],
  },
] as const;

it.each(cases)('$subject 팔로우 실패는 상태를 유지하고 성공한 뒤 저장 목록을 갱신한다', async (item) => {
  const user = userEvent.setup();
  const store = createStore();
  const client = new QueryClient();
  client.setQueryData(item.detailKey, { data: { [item.statusField]: false, follow_count: 9 } });
  client.setQueryData(item.savedKey, []);
  item.extraKeys.forEach((key) => client.setQueryData(key, []));
  item.patch.mockReset().mockRejectedValueOnce(new Error('503')).mockResolvedValueOnce(item.response);

  render(
    <QueryClientProvider client={client}>
      <Provider store={store}>{item.board}</Provider>
    </QueryClientProvider>,
  );

  const button = screen.getByRole('button', { name: item.actionName, exact: true });
  await user.click(button);
  expect(screen.getByRole('button', { name: item.actionName, exact: true })).toBeVisible();
  expect(screen.getByText('9')).toBeVisible();
  await waitFor(() => expect(store.get(snackbarState).type).toBe('ERROR'));
  expect(client.getQueryState(item.savedKey)?.isInvalidated).toBe(false);

  await user.click(button);
  await waitFor(() => expect(store.get(snackbarState).type).toBe('SUCCESS'));
  expect(item.patch).toHaveBeenCalledTimes(2);
  expect(client.getQueryData(item.detailKey)).toMatchObject({ data: { [item.statusField]: true, follow_count: 10 } });
  expect(client.getQueryState(item.savedKey)?.isInvalidated).toBe(true);
  item.extraKeys.forEach((key) => expect(client.getQueryState(key)?.isInvalidated).toBe(true));
});
