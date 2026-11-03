'use client';

import type { ReactElement } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteCookie } from 'cookies-next';
import { useRouter } from 'next/navigation';
import { useSetAtom } from 'jotai';
import { ACCESS_TOKEN } from '@/constants';
import { snackbarState } from '@/store';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { postWithdraw } from './apis';

export default function WithdrawModal({
  isOpen,
  onOpenChange,
  trigger,
  counts,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: ReactElement;
  counts?: { bookmarks?: number; lawmakers?: number; parties?: number };
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setSnackbar = useSetAtom(snackbarState);
  const withdraw = useMutation({
    mutationFn: async () => {
      const response = await postWithdraw();
      if (Number(response.code) !== 200) throw new Error('탈퇴 결과를 확인하지 못했습니다.');
    },
    onSuccess: () => {
      deleteCookie(ACCESS_TOKEN);
      queryClient.clear();
      onOpenChange(false);
      setSnackbar({ show: true, type: 'SUCCESS', message: '회원탈퇴가 완료됐습니다.', duration: 3000 });
      router.replace('/');
    },
  });

  const changeOpen = (open: boolean) => {
    if (withdraw.isPending) return;
    withdraw.reset();
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={changeOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>회원탈퇴를 진행할까요?</DialogTitle>
          <DialogDescription>
            서비스 계정과 로그인 연결 정보가 삭제됩니다. 탈퇴 후에는 복구할 수 없습니다.
          </DialogDescription>
        </DialogHeader>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">
          <li>스크랩한 법안{counts?.bookmarks !== undefined && ` ${counts.bookmarks}건`}</li>
          <li>팔로우한 의원{counts?.lawmakers !== undefined && ` ${counts.lawmakers}명`}</li>
          <li>팔로우한 정당{counts?.parties !== undefined && ` ${counts.parties}개`}</li>
          <li>알림과 검색 기록</li>
        </ul>
        {withdraw.isError && (
          <p role="alert" className="text-sm text-destructive">
            회원탈퇴를 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => changeOpen(false)} disabled={withdraw.isPending}>
            취소
          </Button>
          <Button variant="destructive" onClick={() => withdraw.mutate()} disabled={withdraw.isPending}>
            {withdraw.isPending ? '탈퇴 처리 중…' : '탈퇴하기'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
