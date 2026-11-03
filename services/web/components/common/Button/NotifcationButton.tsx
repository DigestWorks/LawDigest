'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { IconNotification } from '@/public/svgs';
import { Badge } from '@heroui/badge';
import { useGetNotificationCount } from '@/app/notification/apis';
import { getCookie } from 'cookies-next';
import { ACCESS_TOKEN } from '@/constants';
import { useSetAtom } from 'jotai';
import { snackbarState } from '@/store';

export default function NotificationButton() {
  const accessToken = getCookie(ACCESS_TOKEN);
  const setSnackbar = useSetAtom(snackbarState);

  const { data: notificationCount } = useGetNotificationCount({ enabled: Boolean(accessToken) });
  const unread = notificationCount?.notification_count ?? 0;

  if (!accessToken) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="[&_svg]:size-6"
        aria-label="알림"
        onClick={() =>
          setSnackbar({ show: true, type: 'ERROR', message: '로그인이 필요한 서비스입니다.', duration: 3000 })
        }>
        <IconNotification />
      </Button>
    );
  }

  return (
    <Button asChild variant="ghost" size="icon" className="[&_svg]:size-6">
      <Link href="/notification" aria-label={unread > 0 ? `알림, 읽지 않은 알림 ${unread}개` : '알림'}>
        {unread > 0 ? (
          <Badge shape="circle" content="" color="danger" size="sm">
            <IconNotification />
          </Badge>
        ) : (
          <IconNotification />
        )}
      </Link>
    </Button>
  );
}
