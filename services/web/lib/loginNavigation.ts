export function loginReturnTo(value?: string | null): string {
  if (!value?.startsWith('/')) return '/mypage';

  try {
    const target = new URL(value, 'https://lawdigest.kr');
    if (
      target.origin !== 'https://lawdigest.kr' ||
      target.pathname === '/login' ||
      target.pathname.startsWith('/login/')
    ) {
      return '/mypage';
    }
    return target.pathname + target.search + target.hash;
  } catch {
    return '/mypage';
  }
}

export function loginHref(returnTo: string, error?: 'cancelled' | 'failed'): string {
  const params = new URLSearchParams({ returnTo: loginReturnTo(returnTo) });
  if (error) params.set('error', error);
  return `/login?${params}`;
}

export type OAuthProvider = 'kakao' | 'google' | 'naver' | 'apple';

/** Apple 로그인은 백엔드에 Apple 설정을 넣은 환경에서만 NEXT_PUBLIC_APPLE_LOGIN_ENABLED=true로 켠다. */
export function oauthProviders(): OAuthProvider[] {
  const providers: OAuthProvider[] = ['kakao', 'google', 'naver'];
  if (process.env.NEXT_PUBLIC_APPLE_LOGIN_ENABLED === 'true') providers.push('apple');
  return providers;
}

export function oauthLoginHref(provider: OAuthProvider, returnTo: string): string {
  const callback = new URL(`/login/${provider}Login`, process.env.NEXT_PUBLIC_DOMAIN ?? 'https://lawdigest.kr');
  callback.searchParams.set('returnTo', loginReturnTo(returnTo));
  const start = new URL(
    `/v1/oauth2/authorization/${provider}`,
    process.env.NEXT_PUBLIC_URL ?? 'https://api.lawdigest.kr',
  );
  start.searchParams.set('redirect_uri', callback.toString());
  return start.toString();
}
