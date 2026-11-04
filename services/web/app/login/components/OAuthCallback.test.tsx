import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import OAuthCallback from './OAuthCallback';

const { replace, cookie } = vi.hoisted(() => ({ replace: vi.fn(), cookie: vi.fn() }));
const router = { replace };
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('cookies-next', () => ({ getCookie: cookie }));

beforeEach(() => {
  replace.mockReset();
  cookie.mockReset();
});
afterEach(cleanup);

it('취소 응답을 안내 화면으로 replace하고 원래 검색 조건을 유지한다', async () => {
  window.history.replaceState({}, '', '/login/googleLogin?error=%5Baccess_denied%5D&returnTo=%2F%3Ftab%3Dfollowing');
  render(<OAuthCallback />);
  await waitFor(() => expect(replace).toHaveBeenCalledOnce());
  const target = new URL(replace.mock.calls[0][0], window.location.origin);
  expect(target.pathname).toBe('/login');
  expect(target.searchParams.get('error')).toBe('cancelled');
  expect(target.searchParams.get('returnTo')).toBe('/?tab=following');
});

it('세션 쿠키가 없는 성공 URL은 실패 안내로 돌아간다', async () => {
  window.history.replaceState({}, '', '/login/kakaoLogin?returnTo=%2Fnotification');
  render(<OAuthCallback />);
  await waitFor(() => expect(replace).toHaveBeenCalledOnce());
  expect(replace.mock.calls[0][0]).toBe('/login?returnTo=%2Fnotification&error=failed');
});

it('세션 쿠키가 있는 콜백은 원래 내부 화면으로 replace한다', async () => {
  cookie.mockReturnValue('test-session-presence');
  window.history.replaceState({}, '', '/login/naverLogin?returnTo=%2Fbill%2Ftest%3Fview%3Dsummary');
  render(<OAuthCallback />);
  await waitFor(() => expect(replace).toHaveBeenCalledWith('/bill/test?view=summary'));
});
