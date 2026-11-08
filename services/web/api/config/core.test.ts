import { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { beforeEach, expect, it, vi } from 'vitest';

const { transport, expired, cookie } = vi.hoisted(() => ({
  transport: vi.fn(),
  expired: vi.fn(),
  cookie: { value: 'old-access' },
}));

vi.mock('axios', async (original) => {
  const axiosModule = await original<typeof import('axios')>();
  return {
    ...axiosModule,
    default: {
      ...axiosModule.default,
      create: (config: object) => axiosModule.default.create({ ...config, adapter: transport }),
    },
  };
});
vi.mock('cookies-next', () => ({ getCookie: () => cookie.value }));
vi.mock('../auth', () => ({ handleFailReissueToken: expired }));

beforeEach(() => {
  vi.resetModules();
  transport.mockReset();
  expired.mockReset();
  cookie.value = 'old-access';
});

const response = (config: InternalAxiosRequestConfig, status: number, data: unknown) => ({
  config,
  status,
  statusText: String(status),
  headers: {},
  data,
});

const failure = (config: InternalAxiosRequestConfig, status: number) =>
  new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, undefined, response(config, status, {}));

it('동시에 만료된 요청은 재발급을 공유하고 재시도한 원래 응답을 반환한다', async () => {
  transport.mockImplementation(async (config: InternalAxiosRequestConfig) => {
    if (config.url === '/auth/reissue/token') {
      await Promise.resolve();
      cookie.value = 'new-access';
      return response(config, 200, { data: 'success' });
    }
    if (config.headers.Authorization === 'Bearer old-access') throw failure(config, 401);
    return response(config, 200, { data: config.url });
  });
  const { default: http } = await import('./core');
  await expect(Promise.all([http.get({ url: '/first' }), http.get({ url: '/second' })])).resolves.toEqual([
    { data: '/first' },
    { data: '/second' },
  ]);
  expect(transport.mock.calls.filter(([config]) => config.url === '/auth/reissue/token')).toHaveLength(1);
  expect(expired).not.toHaveBeenCalled();
});

it('재발급 401은 한 번만 요청하고 원 요청을 실패로 전달한다', async () => {
  transport.mockImplementation(async (config: InternalAxiosRequestConfig) => {
    throw failure(config, 401);
  });
  const { default: http } = await import('./core');
  const results = await Promise.allSettled([http.get({ url: '/first' }), http.get({ url: '/second' })]);
  for (const result of results) {
    expect(result).toMatchObject({ status: 'rejected', reason: { response: { status: 401 } } });
  }
  expect(transport).toHaveBeenCalledTimes(3);
  expect(expired).toHaveBeenCalledOnce();
});

it('재발급의 일시적인 서버 실패는 로그인 이동 없이 전달한다', async () => {
  transport.mockImplementation(async (config: InternalAxiosRequestConfig) => {
    throw failure(config, config.url === '/auth/reissue/token' ? 503 : 401);
  });
  const { default: http } = await import('./core');
  await expect(http.get({ url: '/protected' })).rejects.toMatchObject({ response: { status: 503 } });
  expect(transport).toHaveBeenCalledTimes(2);
  expect(expired).not.toHaveBeenCalled();
});

it('재발급 성공 뒤에도 401인 요청은 반복해서 재발급하지 않는다', async () => {
  transport.mockImplementation(async (config: InternalAxiosRequestConfig) => {
    if (config.url === '/auth/reissue/token') return response(config, 200, { data: 'success' });
    throw failure(config, 401);
  });
  const { default: http } = await import('./core');
  await expect(http.get({ url: '/protected' })).rejects.toMatchObject({ response: { status: 401 } });
  expect(transport).toHaveBeenCalledTimes(3);
  expect(expired).toHaveBeenCalledOnce();
});
