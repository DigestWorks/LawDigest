import { expect, it } from 'vitest';
import { retryTransientApiError } from './apiTiming';

it.each([400, 401, 403, 404, 429])('HTTP %s를 자동으로 재시도하지 않는다', (status) => {
  expect(retryTransientApiError(0, { isAxiosError: true, response: { status } })).toBe(false);
});

it.each(['ECONNABORTED', 'ETIMEDOUT', 'ERR_CANCELED'])('%s 요청을 자동으로 재시도하지 않는다', (code) => {
  expect(retryTransientApiError(0, { isAxiosError: true, code })).toBe(false);
});

it.each([{ response: { status: 503 } }, { code: 'ERR_NETWORK' }, { code: 'ECONNRESET' }])(
  '일시적 요청 실패를 한 번만 재시도한다',
  (details) => {
    const error = { isAxiosError: true, ...details };
    expect(retryTransientApiError(0, error)).toBe(true);
    expect(retryTransientApiError(1, error)).toBe(false);
  },
);
