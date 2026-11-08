'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCookie } from 'cookies-next';
import { ACCESS_TOKEN } from '@/constants';
import { SectionLoading } from '@/components/common/SectionState';
import { loginHref, loginReturnTo } from '@/lib/loginNavigation';

const CANCEL_CODES = ['access_denied', 'user_cancelled_authorize'];

export default function OAuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const returnTo = loginReturnTo(params.get('returnTo'));
    if (params.has('error')) {
      // access_denied: 카카오·구글·네이버 취소, user_cancelled_authorize: Apple 취소
      const code = params.get('error')?.toLowerCase() ?? '';
      const error = CANCEL_CODES.some((cancel) => code.includes(cancel)) ? 'cancelled' : 'failed';
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
