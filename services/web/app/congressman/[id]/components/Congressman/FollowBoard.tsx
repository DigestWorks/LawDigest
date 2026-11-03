'use client';

import { Button } from '@heroui/react';
import { getCookie } from 'cookies-next';
import { ACCESS_TOKEN } from '@/constants';
import { useSetAtom } from 'jotai';
import { snackbarState } from '@/store';
import { IconCheck, IconPlus } from '@/public/svgs';
import { usePatchCongressmanFollow } from '../../apis';

export default function FollowBoard({
  id,
  likeChecked,
  follow_count,
  represent_count,
  public_count,
}: {
  id: string;
  likeChecked: boolean;
  follow_count: number;
  represent_count: number;
  public_count: number;
}) {
  const mutationFollow = usePatchCongressmanFollow(id);
  const setSnackbar = useSetAtom(snackbarState);

  const onClickFollow = () => {
    if (!getCookie(ACCESS_TOKEN)) {
      setSnackbar({ show: true, type: 'ERROR', message: '로그인이 필요한 서비스입니다.', duration: 3000 });
      return;
    }
    mutationFollow.mutate(!likeChecked, {
      onSuccess: (followed) =>
        setSnackbar({
          show: true,
          type: followed ? 'SUCCESS' : 'CANCEL',
          message: followed ? '해당 의원을 팔로우했습니다.' : '해당 의원의 팔로우를 취소했습니다.',
          duration: 3000,
        }),
      onError: () =>
        setSnackbar({ show: true, type: 'ERROR', message: '팔로우를 변경하지 못했습니다.', duration: 3000 }),
    });
  };

  return (
    <div className="flex flex-col w-full gap-5">
      <div className="flex justify-between w-full">
        <div className="flex flex-col items-center basis-1/3">
          <p className="text-2xl font-semibold">{follow_count}</p>
          <p className="text-sm font-medium text-gray-2">팔로워</p>
        </div>
        <div className="flex flex-col items-center basis-1/3">
          <p className="text-2xl font-semibold">{represent_count}</p>
          <p className="text-sm font-medium text-gray-2">대표발의법안</p>
        </div>
        <div className="flex flex-col items-center basis-1/3">
          <p className="text-2xl font-semibold">{public_count}</p>
          <p className="text-sm font-medium text-gray-2">공동발의법안</p>
        </div>
      </div>

      <Button
        radius="full"
        onPress={onClickFollow}
        isDisabled={mutationFollow.isPending}
        aria-pressed={likeChecked}
        endContent={likeChecked ? <IconCheck /> : <IconPlus />}
        className={`w-full h-12 text-lg font-medium flex justify-between px-6 ${likeChecked ? 'bg-gray-1 text-gray-3' : 'bg-primary-3 text-white dark:bg-gray-4 dark:text-gray-2'} `}>
        {likeChecked ? '팔로우 중' : '팔로우 하기'}
      </Button>
    </div>
  );
}
