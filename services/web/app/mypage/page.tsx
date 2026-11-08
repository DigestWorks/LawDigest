'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCookie } from 'cookies-next';
import { ACCESS_TOKEN } from '@/constants';
import { loginHref } from '@/lib/loginNavigation';
import { MyPageSkeleton } from '@/components/common/Skeletons';
import { useSetAtom } from 'jotai';
import { snackbarState } from '@/store';
import { CongressmanList, UserInfo, PartyList, BillContainer } from './components';
import AccountActions from './components/UserInfo/AccountActions';

export default function MyPage() {
  const router = useRouter();
  const [sessionReady, setSessionReady] = useState(false);
  const setSnackbar = useSetAtom(snackbarState);

  useEffect(() => {
    if (getCookie(ACCESS_TOKEN)) {
      setSessionReady(true);
      return;
    }
    setSnackbar({ show: true, type: 'ERROR', message: '로그인이 필요한 서비스입니다.', duration: 3000 });
    router.replace(loginHref(window.location.pathname + window.location.search + window.location.hash));
  }, [router, setSnackbar]);

  if (!sessionReady) {
    return (
      <>
        <h1 className="sr-only">마이페이지</h1>
        <MyPageSkeleton />
      </>
    );
  }

  return (
    <div className="flex flex-col h-full gap-8 lg:flex-row md:items-center lg:items-start lg:justify-center lg:mt-10 lg:mx-auto lg:ml-10 xl:ml-0">
      <h1 className="sr-only">마이페이지</h1>
      <UserInfo />
      <div className="flex flex-col h-full gap-8">
        <PartyList />
        <hr className="mx-[30px] border-[#E0E0E0] dark:border-dark-l lg:border-transparent dark:lg:border-transparent" />
        <CongressmanList />
        <hr className="mx-[30px] border-[#E0E0E0] dark:border-dark-l lg:border-transparent dark:lg:border-transparent" />
        <BillContainer />
        <AccountActions />
      </div>
    </div>
  );
}
