import { afterEach, expect, it, vi } from 'vitest';
import { loginHref, loginReturnTo, oauthLoginHref } from './loginNavigation';

afterEach(() => vi.unstubAllEnvs());

it.each(['https://example.com', '//example.com', '/\\example.com', '/login', '/login/googleLogin?returnTo=/login'])(
  '인증 복귀 주소 %s는 내부 기본 화면으로 제한한다',
  (target) => expect(loginReturnTo(target)).toBe('/mypage'),
);

it('복귀 주소의 경로와 검색 조건 및 위치를 유지한다', () => {
  const target = '/search/교육?tab=bill#results';
  const login = new URL(loginHref(target, 'cancelled'), 'https://lawdigest.kr');
  expect(login.searchParams.get('returnTo')).toBe('/search/%EA%B5%90%EC%9C%A1?tab=bill#results');
  expect(login.searchParams.get('error')).toBe('cancelled');
});

it.each(['google', 'kakao', 'naver'] as const)('%s OAuth 시작부터 콜백까지 복귀 주소를 전달한다', (provider) => {
  vi.stubEnv('NEXT_PUBLIC_DOMAIN', 'https://lawdigest.kr');
  vi.stubEnv('NEXT_PUBLIC_URL', 'https://api.lawdigest.kr/');
  const start = new URL(oauthLoginHref(provider, '/?tab=following'));
  const callback = new URL(start.searchParams.get('redirect_uri')!);
  expect(start.pathname).toBe(`/v1/oauth2/authorization/${provider}`);
  expect(callback.pathname).toBe(`/login/${provider}Login`);
  expect(callback.searchParams.get('returnTo')).toBe('/?tab=following');
});
