'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCookie } from 'cookies-next';
import { SectionEmpty } from '@/components/common/SectionState';
import { NotificationListSkeleton } from '@/components/common/Skeletons';
import { ACCESS_TOKEN } from '@/constants';
import { loginHref } from '@/lib/loginNavigation';
import { NotificationList } from './components';

export default function Notification() {
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    setHasSession(Boolean(getCookie(ACCESS_TOKEN)));
  }, []);

  return (
    <section className="mx-auto w-full max-w-[840px]">
      <h1 className="sr-only">알림</h1>
      {hasSession === null && <NotificationListSkeleton />}
      {hasSession === false && (
        <div className="p-5">
          <SectionEmpty>
            알림을 보려면{' '}
            <Link href={loginHref('/notification')} className="font-medium underline underline-offset-4">
              로그인
            </Link>
            해 주세요.
          </SectionEmpty>
        </div>
      )}
      {hasSession === true && <NotificationList />}
    </section>
  );
}
