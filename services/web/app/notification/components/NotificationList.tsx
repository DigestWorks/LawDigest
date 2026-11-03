'use client';

import { useCallback } from 'react';
import { getDateStatus } from '@/utils';
import { Divider, Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/react';
import { IconKebab } from '@/public/svgs';
import { useSetAtom } from 'jotai';
import { snackbarState } from '@/store';
import {
  useGetNotificationCount,
  useGetNotification,
  usePutNotificationRead,
  usePutNotificationReadAll,
  useDeleteNotification,
  useDeleteNotificationAll,
} from '../apis';
import NotificationItem from './NotificationItem';

export default function NotificationList() {
  const { data: notificationCount } = useGetNotificationCount();
  const { data: notifications } = useGetNotification();
  const setSnackbar = useSetAtom(snackbarState);
  const mutateRead = usePutNotificationRead();
  const mutateDelete = useDeleteNotification();
  const mutateReadAll = usePutNotificationReadAll();
  const mutateDeleteAll = useDeleteNotificationAll();
  const listByDateStatus = ['지난 한 주', '지난 한 달', '지난 알림'].map(
    (status) => notifications?.filter(({ created_date }) => getDateStatus(created_date) === status) ?? [],
  );

  const onClickRead = useCallback(
    (notificationId: number, isClickByButton: boolean) => {
      mutateRead.mutate(notificationId);
      if (isClickByButton) {
        setSnackbar({
          show: true,
          type: 'SUCCESS',
          message: '해당 알림을 읽었습니다.',
          duration: 3000,
        });
      }
    },
    [mutateRead],
  );

  const onClickDelete = useCallback(
    (notificationId: number) => {
      mutateDelete.mutate(notificationId);
      setSnackbar({
        show: true,
        type: 'CANCEL',
        message: '해당 알림을 삭제했습니다.',
        duration: 3000,
      });
    },
    [mutateDelete],
  );

  const onClickReadAll = useCallback(() => {
    mutateReadAll.mutate();
    setSnackbar({
      show: true,
      type: 'SUCCESS',
      message: '알림을 모두 읽었습니다.',
      duration: 3000,
    });
  }, [mutateReadAll]);

  const onClickDeleteAll = useCallback(() => {
    mutateDeleteAll.mutate();
    setSnackbar({
      show: true,
      type: 'CANCEL',
      message: '알림을 모두 삭제했습니다.',
      duration: 3000,
    });
  }, [mutateDeleteAll]);

  return (
    <section className="flex flex-col px-5 mt-6 mb-10">
      <div className="mb-[18px] ml-3">
        <div className="flex justify-between items-center">
          {notificationCount?.notification_count === 0 ? (
            <p className="text-sm md:text-base text-gray-2 dark:text-muted-foreground">알림이 없습니다.</p>
          ) : (
            <p className="text-sm md:text-base text-gray-2 dark:text-muted-foreground">
              <span className="text-black dark:text-gray-2">{notificationCount?.notification_count}개</span>의 읽지 않은
              알림이 있습니다.
            </p>
          )}
          <Dropdown>
            <DropdownTrigger>
              <Button isIconOnly size="sm" className="bg-transparent" aria-label="전체 알림 관리">
                <IconKebab isPassed />
              </Button>
            </DropdownTrigger>
            <DropdownMenu aria-label="전체 알림 관리">
              <DropdownItem key="read-all" onClick={onClickReadAll}>
                모두 읽음 표시
              </DropdownItem>
              <DropdownItem key="delete-all" onClick={onClickDeleteAll}>
                모두 삭제
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>
      </div>

      <section className="flex flex-col gap-[14px]">
        <h2 className="text-xl font-semibold">지난 한 주</h2>
        <div className="flex flex-col gap-3 md:gap-4">
          {notifications &&
            (listByDateStatus[0].length === 0 ? (
              <p className="text-sm md:text-base text-gray-2 dark:text-muted-foreground">지난 한 주 알림이 없습니다.</p>
            ) : (
              listByDateStatus[0].map((notification) => (
                <NotificationItem
                  key={notification.notification_id}
                  {...notification}
                  onClickRead={onClickRead}
                  onClickDelete={onClickDelete}
                />
              ))
            ))}
        </div>

        <Divider className="my-6" />

        <h2 className="text-xl font-semibold">지난 한 달</h2>
        <div className="flex flex-col gap-3 md:gap-4">
          {notifications &&
            (listByDateStatus[1].length === 0 ? (
              <p className="text-sm md:text-base text-gray-2 dark:text-muted-foreground">지난 한 달 알림이 없습니다.</p>
            ) : (
              listByDateStatus[1].map((notification) => (
                <NotificationItem
                  key={notification.notification_id}
                  {...notification}
                  onClickRead={onClickRead}
                  onClickDelete={onClickDelete}
                />
              ))
            ))}
        </div>

        <Divider className="my-6" />

        <h2 className="text-xl font-semibold">지난 알림</h2>
        <div className="flex flex-col gap-3 md:gap-4">
          {notifications &&
            (listByDateStatus[2].length === 0 ? (
              <p className="text-sm md:text-base text-gray-2 dark:text-muted-foreground">지난 알림이 없습니다.</p>
            ) : (
              listByDateStatus[2].map((notification) => (
                <NotificationItem
                  key={notification.notification_id}
                  {...notification}
                  onClickRead={onClickRead}
                  onClickDelete={onClickDelete}
                />
              ))
            ))}
        </div>
      </section>
    </section>
  );
}
