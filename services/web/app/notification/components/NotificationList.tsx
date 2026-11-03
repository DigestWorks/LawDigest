'use client';

import { useCallback, useRef, useState } from 'react';
import { getDateStatus } from '@/utils';
import { SectionError, SectionLoading } from '@/components/common/SectionState';
import { Divider, Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/react';
import { IconKebab } from '@/public/svgs';
import { useSetAtom } from 'jotai';
import { snackbarState } from '@/store';
import type { SnackbarType } from '@/types';
import { Button as DialogButton } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  const countQuery = useGetNotificationCount();
  const listQuery = useGetNotification();
  const notificationCount = countQuery.data?.notification_count;
  const notifications = listQuery.data;
  const setSnackbar = useSetAtom(snackbarState);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const manageButtonRef = useRef<HTMLButtonElement>(null);
  const totalNotifications = notifications?.length ?? 0;
  const notify = useCallback(
    (type: SnackbarType, message: string) => setSnackbar({ show: true, type, message, duration: 3000 }),
    [setSnackbar],
  );
  const mutateRead = usePutNotificationRead({
    onError: () => notify('ERROR', '알림 읽기에 실패했습니다.'),
  });
  const mutateDelete = useDeleteNotification({
    onSuccess: () => notify('CANCEL', '해당 알림을 삭제했습니다.'),
    onError: () => notify('ERROR', '알림 삭제에 실패했습니다.'),
  });
  const mutateReadAll = usePutNotificationReadAll({
    onSuccess: () => notify('SUCCESS', '알림을 모두 읽었습니다.'),
    onError: () => notify('ERROR', '알림을 모두 읽음으로 표시하지 못했습니다.'),
  });
  const mutateDeleteAll = useDeleteNotificationAll({
    onSuccess: () => {
      setDeleteAllOpen(false);
      notify('CANCEL', '알림을 모두 삭제했습니다.');
    },
  });
  const listByDateStatus = ['지난 한 주', '지난 한 달', '지난 알림'].map(
    (status) => notifications?.filter(({ created_date }) => getDateStatus(created_date) === status) ?? [],
  );

  const onClickRead = (notificationId: number, isClickByButton: boolean) => {
    mutateRead.mutate(
      notificationId,
      isClickByButton ? { onSuccess: () => notify('SUCCESS', '해당 알림을 읽었습니다.') } : undefined,
    );
  };

  const onClickDelete = (notificationId: number) => {
    mutateDelete.mutate(notificationId);
  };

  const changeDeleteAllOpen = (open: boolean) => {
    if (mutateDeleteAll.isPending) return;
    mutateDeleteAll.reset();
    setDeleteAllOpen(open);
  };

  if (notificationCount == null || !notifications) {
    const failed = (notificationCount == null && countQuery.isError) || (!notifications && listQuery.isError);
    return (
      <div className="p-5">
        {failed ? (
          <SectionError
            message="알림을 불러오지 못했습니다."
            pending={countQuery.isFetching || listQuery.isFetching}
            onRetry={() => {
              if (notificationCount == null) void countQuery.refetch();
              if (!notifications) void listQuery.refetch();
            }}
          />
        ) : (
          <SectionLoading>알림을 불러오는 중입니다.</SectionLoading>
        )}
      </div>
    );
  }

  return (
    <section className="flex flex-col px-5 mt-6 mb-10">
      <div className="mb-[18px] ml-3">
        <div className="flex justify-between items-center">
          {notificationCount === 0 ? (
            <p className="text-sm md:text-base text-gray-2 dark:text-muted-foreground">알림이 없습니다.</p>
          ) : (
            <p className="text-sm md:text-base text-gray-2 dark:text-muted-foreground">
              <span className="text-black dark:text-gray-2">{notificationCount}개</span>의 읽지 않은 알림이 있습니다.
            </p>
          )}
          <Dropdown disableAnimation>
            <DropdownTrigger>
              <Button ref={manageButtonRef} isIconOnly size="sm" className="bg-transparent" aria-label="전체 알림 관리">
                <IconKebab isPassed />
              </Button>
            </DropdownTrigger>
            <DropdownMenu aria-label="전체 알림 관리" disabledKeys={totalNotifications === 0 ? ['delete-all'] : []}>
              <DropdownItem key="read-all" onPress={() => mutateReadAll.mutate()}>
                모두 읽음 표시
              </DropdownItem>
              <DropdownItem key="delete-all" onPress={() => requestAnimationFrame(() => changeDeleteAllOpen(true))}>
                모두 삭제
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>
      </div>

      <Dialog open={deleteAllOpen} onOpenChange={changeDeleteAllOpen}>
        <DialogContent
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            manageButtonRef.current?.focus();
          }}>
          <DialogHeader>
            <DialogTitle>알림을 모두 삭제할까요?</DialogTitle>
            <DialogDescription>
              현재 표시된 {totalNotifications}건을 포함해 모든 알림을 삭제합니다. 삭제한 알림은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          {mutateDeleteAll.isError && (
            <p role="alert" className="text-sm text-destructive">
              알림을 삭제하지 못했습니다. 다시 시도해 주세요.
            </p>
          )}
          <DialogFooter>
            <DialogButton
              variant="outline"
              onClick={() => changeDeleteAllOpen(false)}
              disabled={mutateDeleteAll.isPending}>
              취소
            </DialogButton>
            <DialogButton
              variant="destructive"
              disabled={mutateDeleteAll.isPending || totalNotifications === 0}
              onClick={() => mutateDeleteAll.mutate()}>
              {mutateDeleteAll.isPending ? '삭제 중…' : '모두 삭제'}
            </DialogButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
