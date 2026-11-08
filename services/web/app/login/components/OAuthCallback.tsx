'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCookie } from 'cookies-next';
import { ACCESS_TOKEN } from '@/constants';
import { SectionLoading } from '@/components/common/SectionState';
import { loginHref, loginReturnTo } from '@/lib/loginNavigation';

export default function OAuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const returnTo = loginReturnTo(params.get('returnTo'));
    if (params.has('error')) {
      const error = params.get('error')?.toLowerCase().includes('access_denied') ? 'cancelled' : 'failed';
      router.replace(loginHref(returnTo, error));
      return;
    }
    router.replace(getCookie(ACCESS_TOKEN) ? returnTo : loginHref(returnTo, 'failed'));
  }, [router]);

  return (
    <section className="mx-auto w-full max-w-xl p-6">
      <h1 className="sr-only">로그인 확인</h1>
      <SectionLoading>로그인 상태를 확인하는 중입니다.</SectionLoading>
    </section>
  );
}
