import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ragProxy } from '@/lib/ragProxy';
import { unavailableStatus } from '@/lib/rag';

const token = 'private-proxy-test-token-123456789';
const question = { question: '청년 주거 지원 법안은?', assembly: 22, history: [] };
const request = (body: unknown = question, origin = 'https://lawdigest.kr') =>
  new Request('https://lawdigest.kr/api/qa', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify(body),
  });
beforeEach(() => {
  vi.stubEnv('RAG_ENABLED', 'true');
  vi.stubEnv('RAG_INTERNAL_TOKEN', token);
  vi.stubEnv('RAG_PUBLIC_ORIGIN', 'https://lawdigest.kr');
  vi.stubEnv('RAG_INTERNAL_URL', 'http://127.0.0.1:8110');
});
afterEach(() => vi.unstubAllEnvs());

describe('public question proxy', () => {
  it.each(['search', 'chat'] as const)('applies origin and body validation to %s', async (mode) => {
    const fetcher = vi.fn();
    expect((await ragProxy(request(question, 'https://other.example'), fetcher, mode)).status).toBe(403);
    expect((await ragProxy(request({ ...question, question: ' ' }), fetcher, mode)).status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('forwards streaming state and cancellation through the private chat path', async () => {
    const body = 'data: {"type":"step"}\n\n';
    const fetcher = vi.fn().mockResolvedValue(new Response(body, { headers: { 'Content-Type': 'text/event-stream' } }));
    const controller = new AbortController();
    const incoming = request();
    Object.defineProperty(incoming, 'signal', { value: controller.signal });
    const result = await ragProxy(incoming, fetcher, 'chat');
    expect(String(fetcher.mock.calls[0][0])).toBe('http://127.0.0.1:8110/v1/chat');
    expect(result.headers.get('x-accel-buffering')).toBe('no');
    expect(await result.text()).toBe(body);
    controller.abort();
    expect(fetcher.mock.calls[0][1].signal.aborted).toBe(true);
  });
  it('requires an actual stream for a chat response', async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ private: 'upstream' }));
    const response = await ragProxy(request(), fetcher, 'chat');
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('upstream');
  });
  it('does not expose an unconfigured feature or call an upstream', async () => {
    vi.stubEnv('RAG_ENABLED', 'false');
    const fetcher = vi.fn();
    const result = await ragProxy(new Request('https://lawdigest.kr/api/qa'), fetcher);
    expect(await result.json()).toEqual(unavailableStatus);
    expect((await ragProxy(request(), fetcher)).status).toBe(503);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each(['https://other.example', 'null', ''])('rejects a foreign or missing browser origin %s', async (origin) => {
    const fetcher = vi.fn();
    expect((await ragProxy(request(question, origin), fetcher)).status).toBe(403);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([
    { ...question, question: ' ' },
    { ...question, question: 'a'.repeat(1001) },
    { ...question, assembly: 20 },
    { ...question, history: [{ question: '이전 질문', source_ids: ['../invalid'], assembly: 22 }] },
    { ...question, extra: 'unexpected' },
  ])('rejects an invalid question before calling a provider', async (body) => {
    const fetcher = vi.fn();
    expect((await ragProxy(request(body), fetcher)).status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('bounds the streamed request body without relying on Content-Length', async () => {
    const fetcher = vi.fn();
    expect((await ragProxy(request({ ...question, question: '가'.repeat(40000) }), fetcher)).status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('forwards a private credential and a hash while preserving explicit insufficient evidence', async () => {
    const answer = {
      status: 'insufficient_evidence',
      paragraphs: [],
      sources: [],
      limitations: ['근거를 찾지 못했습니다.'],
      metadata: unavailableStatus,
    };
    const fetcher = vi.fn().mockResolvedValue(Response.json(answer));
    const result = await ragProxy(request(), fetcher);
    expect(result.status).toBe(200);
    expect(await result.json()).toEqual(answer);
    const [url, options] = fetcher.mock.calls[0];
    expect(String(url)).toBe('http://127.0.0.1:8110/v1/answers');
    expect(options.headers.Authorization).toBe(`Bearer ${token}`);
    expect(options.headers['X-Rag-Client']).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.parse(options.body)).toEqual(question);
    expect(result.headers.get('cache-control')).toBe('no-store');
  });
  it('retains rate-limit semantics while removing arbitrary upstream text', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      Response.json(
        { code: 'QA_DAILY_LIMIT', message: 'private server detail' },
        {
          status: 429,
          headers: { 'Retry-After': '3600' },
        },
      ),
    );
    const response = await ragProxy(request(), fetcher);
    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('3600');
    expect((await response.json()).message).not.toContain('private');
  });
  it('rejects answers with missing or invented source references', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      Response.json({
        status: 'answered',
        sources: [],
        paragraphs: [{ text: '근거 없는 주장', source_keys: ['S99'] }],
        limitations: [],
        metadata: unavailableStatus,
      }),
    );
    const result = await ragProxy(request(), fetcher);
    expect(result.status).toBe(503);
    expect(await result.text()).not.toContain('근거 없는 주장');
  });
  it('does not leak a provider failure or internal URL', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('private upstream URL'));
    const response = await ragProxy(request(), fetcher);
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('private');
  });
});
