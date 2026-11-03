import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import NotificationList from './NotificationList';

const { query, mutate } = vi.hoisted(() => ({ query: vi.fn(), mutate: vi.fn() }));

vi.mock('next-themes', () => ({ useTheme: () => ({ theme: 'dark' }) }));
vi.mock('../apis', () => ({
  useGetNotification: query,
  useGetNotificationCount: () => ({ data: { notification_count: 1 } }),
  usePutNotificationRead: () => ({ mutate }),
  usePutNotificationReadAll: () => ({ mutate }),
  useDeleteNotification: () => ({ mutate }),
  useDeleteNotificationAll: () => ({ mutate }),
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
