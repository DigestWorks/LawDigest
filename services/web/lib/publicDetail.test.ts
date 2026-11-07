import { afterEach, expect, it, vi } from 'vitest';
import { fetchPublicDetail, getPublicBill, getPublicParty, publicDetailError } from './publicDetail';

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('TEST_NOT_FOUND');
  },
}));
afterEach(() => vi.unstubAllGlobals());

it.each([400, 404])('maps resource HTTP %s to the not-found boundary', async (status) => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status })));
  await expect(fetchPublicDetail('/bill/detail/NOPE')).rejects.toThrow('TEST_NOT_FOUND');
});

it('does not turn an upstream outage into a missing resource or leak the response body', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('private backend stack', { status: 500 })));
  await expect(fetchPublicDetail('/bill/detail/B001')).rejects.toThrow(publicDetailError);
});

it('removes connection exceptions from server-rendered errors', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('secret connection URL')));
  const failure = await fetchPublicDetail('/bill/detail/B001').catch((error: Error) => error);
  expect(failure).toBeInstanceOf(Error);
  expect((failure as Error).message).toBe(publicDetailError);
  expect((failure as Error).cause).toBeUndefined();
});

it('uses the numeric response code returned by the backend and keeps requests public', async () => {
  const payload = { code: 200, message: '정상적으로 처리되었습니다.', data: { bill_id: 'B001' } };
  const fetcher = vi.fn().mockResolvedValue(Response.json(payload));
  vi.stubGlobal('fetch', fetcher);
  expect(await fetchPublicDetail('/bill/detail/B001')).toEqual(payload);
  expect(fetcher.mock.calls[0][1].headers).toEqual({ Accept: 'application/json' });
  expect(fetcher.mock.calls[0][1].cache).toBe('no-store');
});

it.each([null, {}, { code: 200, data: null }, { code: 500, data: {} }])(
  'rejects a malformed success body',
  async (payload) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(payload)));
    await expect(fetchPublicDetail('/bill/detail/B001')).rejects.toThrow(publicDetailError);
  },
);

it('rejects malformed URL identifiers before any request', async () => {
  const fetcher = vi.fn();
  vi.stubGlobal('fetch', fetcher);
  expect(() => getPublicBill('../invalid')).toThrow('TEST_NOT_FOUND');
  expect(() => getPublicParty('not-a-party')).toThrow('TEST_NOT_FOUND');
  expect(() => getPublicParty('99999999999999999999999')).toThrow('TEST_NOT_FOUND');
  expect(fetcher).not.toHaveBeenCalled();
});
