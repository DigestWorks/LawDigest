import { createHmac } from 'node:crypto';
import { isRagAnswer, isRagRequest, unavailableStatus } from '@/lib/rag';

const MAX_BODY = 32 * 1024;
const errorMessages: Record<string, string> = {
  QA_UNAVAILABLE: '질의응답을 잠시 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.',
  QA_INVALID_REQUEST: '2~1,000자의 질문과 자료 범위를 확인해 주세요.',
  QA_RATE_LIMIT: '질문 요청이 많습니다. 잠시 후 다시 시도해 주세요.',
  QA_DAILY_LIMIT: '오늘의 질문 요청 한도에 도달했습니다. 내일 다시 이용해 주세요.',
  QA_BUSY: '다른 질문에 답하고 있습니다. 잠시 후 다시 시도해 주세요.',
};
const json = (body: unknown, status = 200, headers: HeadersInit = {}) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
const failure = (code = 'QA_UNAVAILABLE', status = 503, retryAfter?: number) =>
  json(
    { code, message: errorMessages[code] ?? errorMessages.QA_UNAVAILABLE, retry_after: retryAfter ?? null },
    status,
    retryAfter ? { 'Retry-After': String(retryAfter) } : {},
  );

function configuration() {
  const token = process.env.RAG_INTERNAL_TOKEN ?? '';
  if (process.env.RAG_ENABLED !== 'true' || token.length < 24) return null;
  try {
    const url = new URL(process.env.RAG_INTERNAL_URL ?? 'http://127.0.0.1:8110');
    if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.username || url.password) return null;
    return { url, token };
  } catch {
    return null;
  }
}

async function readBody(request: Request) {
  if (!request.body) throw new Error('missing body');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY) {
        await reader.cancel();
        throw new Error('body too large');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
}

export async function ragProxy(
  request: Request,
  fetcher: typeof fetch = fetch,
  mode: 'answers' | 'search' | 'chat' = 'answers',
) {
  const config = configuration();
  if (!config) return request.method === 'GET' ? json(unavailableStatus) : failure();
  const headers: Record<string, string> = { Authorization: `Bearer ${config.token}` };
  let path: string;
  let body: string | undefined;
  if (request.method === 'GET') {
    const assembly = new URL(request.url).searchParams.get('assembly') ?? '22';
    if (!['0', '21', '22'].includes(assembly)) return failure('QA_INVALID_REQUEST', 400);
    path = `/v1/status?assembly=${assembly}`;
  } else if (request.method === 'POST') {
    const allowedOrigin = process.env.RAG_PUBLIC_ORIGIN ?? new URL(request.url).origin;
    if (request.headers.get('origin') !== allowedOrigin) return failure('QA_INVALID_REQUEST', 403);
    if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))
      return failure('QA_INVALID_REQUEST', 400);
    let payload: unknown;
    try {
      payload = await readBody(request);
    } catch {
      return failure('QA_INVALID_REQUEST', 400);
    }
    if (!isRagRequest(payload)) return failure('QA_INVALID_REQUEST', 400);
    body = JSON.stringify(payload);
    headers['Content-Type'] = 'application/json';
    // 이 플래그는 nginx가 X-Real-IP를 덮어쓰는지 확인한 배포 환경에서만 켠다.
    const client = process.env.RAG_TRUST_PROXY_IP === 'true' ? request.headers.get('x-real-ip') : null;
    const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
    headers['X-Rag-Client'] = createHmac('sha256', config.token)
      .update(`${day}:${client?.slice(0, 64) ?? 'shared'}`)
      .digest('hex');
    path = `/v1/${mode}`;
  } else return failure('QA_INVALID_REQUEST', 405);
  let timeout = request.method === 'POST' ? 45000 : 12000;
  if (mode === 'chat') timeout = 120000;
  try {
    const response = await fetcher(new URL(path, config.url), {
      method: request.method,
      headers,
      body,
      cache: 'no-store',
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(timeout)]),
    });
    if (!response.ok) {
      if (request.method === 'GET') return json(unavailableStatus);
      if (response.status === 429) {
        const result = await response.json().catch(() => ({}));
        const code = ['QA_RATE_LIMIT', 'QA_DAILY_LIMIT', 'QA_BUSY'].includes(result.code)
          ? result.code
          : 'QA_RATE_LIMIT';
        const wait = Math.min(86400, Math.max(1, Number(response.headers.get('retry-after')) || 60));
        return failure(code, 429, wait);
      }
      return failure();
    }
    if (mode === 'chat' && request.method === 'POST') {
      if (!response.body || !response.headers.get('content-type')?.startsWith('text/event-stream')) return failure();
      return new Response(response.body, {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-store, no-transform',
          'X-Accel-Buffering': 'no',
        },
      });
    }
    const result = await response.json();
    if (request.method === 'GET') {
      return json(typeof result?.available === 'boolean' ? result : unavailableStatus);
    }
    return isRagAnswer(result) && (mode === 'search' ? result.status === 'searched' : result.status !== 'searched')
      ? json(result)
      : failure();
  } catch {
    return request.method === 'GET' ? json(unavailableStatus) : failure();
  }
}
