'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCookie } from 'cookies-next';
import { ACCESS_TOKEN } from '@/constants';
import { SectionLoading } from '@/components/common/SectionState';
import { useSetAtom } from 'jotai';
import { snackbarState } from '@/store';
import { SearchBarButton } from '@/components';
import { FollowingNav, BillContainer } from './components';

export default function Following() {
  const router = useRouter();
  const [sessionReady, setSessionReady] = useState(false);
  const setSnackbar = useSetAtom(snackbarState);

  useEffect(() => {
    if (getCookie(ACCESS_TOKEN)) {
      setSessionReady(true);
      return;
    }
    setSnackbar({ show: true, type: 'ERROR', message: '로그인이 필요한 서비스입니다.', duration: 3000 });
    router.push('/login');
  }, [router, setSnackbar]);

  if (!sessionReady) {
    return (
      <section className="mx-auto w-full max-w-xl p-6">
        <h1 className="sr-only">팔로잉</h1>
        <SectionLoading>로그인 상태를 확인하는 중입니다.</SectionLoading>
      </section>
    );
  }

  return (
    <section className="flex flex-col mx-auto lg:flex-row lg:justify-center">
      <FollowingNav />
      <div className="mt-4 md:mt-0 lg:border-l-1 lg:dark:border-dark-l">
        <div className="hidden mt-11 lg:block">
          <SearchBarButton />
        </div>
        <BillContainer />
      </div>
    </section>
  );
}
