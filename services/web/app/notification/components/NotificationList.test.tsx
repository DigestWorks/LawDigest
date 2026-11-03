import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore, Provider } from 'jotai';
import { snackbarState } from '@/store';
import { expect, it, vi } from 'vitest';
import NotificationList from './NotificationList';

const { query, mutate, deleteAll, deleteAllHook } = vi.hoisted(() => ({
  query: vi.fn(),
  mutate: vi.fn(),
  deleteAll: vi.fn(),
  deleteAllHook: vi.fn(),
}));

vi.mock('next-themes', () => ({ useTheme: () => ({ theme: 'dark' }) }));
vi.mock('../apis', () => ({
  useGetNotification: query,
  useGetNotificationCount: () => ({ data: { notification_count: 1 } }),
  usePutNotificationRead: () => ({ mutate }),
  usePutNotificationReadAll: () => ({ mutate }),
  useDeleteNotification: () => ({ mutate }),
  useDeleteNotificationAll: deleteAllHook.mockReturnValue({ mutate: deleteAll, reset: vi.fn() }),
}));

it('다크 모드에서 첫 알림 응답을 받으면 알림과 메뉴를 표시한다', () => {
  query.mockReturnValue({ data: undefined });
  const { rerender } = render(<NotificationList />);
  expect(screen.queryByText('법안 접수 표본')).not.toBeInTheDocument();

  query.mockReturnValue({
    data: [
      {
        notification_id: 1,
        title: '법안 접수 표본',
        content: '법안이 접수되었습니다.',
        created_date: new Date().toISOString(),
        type: 'bill_stage_update',
        target: 'fixture-bill',
        extra: '',
        read: false,
        notification_image_url_list: [],
      },
    ],
  });
  rerender(<NotificationList />);

  expect(screen.getByText('법안 접수 표본')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '법안 접수 표본 알림 관리' })).toBeInTheDocument();
});

it.each([
  ['GOVERNMENT', '정부.png', '정부 로고', '/images/government-logo.png'],
  ['CHAIRMAN', '보건복지위원장.png', '보건복지위원회 로고', '/images/committees/health.jpg'],
])('다크 모드에서 %s 법안 알림의 로고와 내용을 표시한다', (extra, image, logo, src) => {
  query.mockReturnValue({
    data: [
      {
        notification_id: 1,
        title: '법안 결과 표본',
        content: '법안이 처리되었습니다.',
        created_date: new Date().toISOString(),
        type: 'bill_result_update',
        target: 'fixture-bill',
        extra,
        read: false,
        notification_image_url_list: [image],
      },
    ],
  });

  const { container } = render(<NotificationList />);
  expect(screen.getByText('법안 결과 표본')).toBeInTheDocument();
  expect(container.querySelector(`img[alt="${logo}"]`)).toHaveAttribute('src', src);
});

it('전체 알림은 확인 뒤 요청하고 서버 성공을 받은 뒤에 완료를 알린다', async () => {
  const user = userEvent.setup();
  const store = createStore();
  deleteAll.mockClear();
  query.mockReturnValue({
    data: [
      {
        notification_id: 1,
        title: '삭제 검증 표본',
        content: '테스트 알림',
        created_date: new Date().toISOString(),
        type: 'bill_stage_update',
        target: 'fixture-bill',
        extra: '',
        read: false,
        notification_image_url_list: [],
      },
    ],
  });

  render(
    <Provider store={store}>
      <NotificationList />
    </Provider>,
  );
  const open = async () => {
    await user.click(screen.getByRole('button', { name: '전체 알림 관리' }));
    await user.click(await screen.findByRole('menuitem', { name: '모두 삭제' }));
  };

  await open();
  expect(deleteAll).not.toHaveBeenCalled();
  const dialog = await screen.findByRole('dialog', { name: '알림을 모두 삭제할까요?' });
  await user.click(within(dialog).getByRole('button', { name: '취소' }));
  expect(deleteAll).not.toHaveBeenCalled();

  await open();
  await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: '모두 삭제' }));
  expect(deleteAll).toHaveBeenCalledTimes(1);
  expect(store.get(snackbarState).show).toBe(false);
  act(() => deleteAllHook.mock.lastCall?.[0]?.onSuccess());
  expect(store.get(snackbarState).message).toBe('알림을 모두 삭제했습니다.');
});
