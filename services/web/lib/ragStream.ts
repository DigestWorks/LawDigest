import { isRagAnswer, isRagStep, type RagAnswer, type RagStep } from '@/lib/rag';

export class RagStreamError extends Error {}

// Expresso의 동일 도구 ID 상태 갱신 방식. 델타 텍스트 대신 검증 완료 답변을 받는다.
export async function readRagStream(response: Response, onStep: (step: RagStep) => void): Promise<RagAnswer> {
  if (!response.body || !response.headers.get('content-type')?.startsWith('text/event-stream'))
    throw new RagStreamError('답변 스트림을 확인할 수 없습니다.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let buffer = '';
  let total = 0;
  let answer: RagAnswer | undefined;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (value) total += value.byteLength;
      if (total > 512 * 1024) throw new RagStreamError('답변 크기를 초과했습니다.');
      buffer += decoder.decode(value, { stream: !done });
      // 서버는 LF 프레임을 사용한다. CRLF도 허용하되 청크 경계의 CR은 유지한다.
      buffer = buffer.replace(/\r\n/g, '\n');
      let end: number;
      while ((end = buffer.indexOf('\n\n')) >= 0) {
        const frame = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        const data = frame
          .split('\n')
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).trimStart())
          .join('\n');
        if (!data) continue;
        if (answer) throw new RagStreamError('답변 완료 후 잘못된 이벤트를 받았습니다.');
        const event: unknown = JSON.parse(data);
        if (!event || typeof event !== 'object') throw new RagStreamError('잘못된 답변 이벤트입니다.');
        const item = event as { type: string; step?: unknown; answer?: unknown; message?: unknown };
        if (item.type === 'step' && isRagStep(item.step)) onStep(item.step);
        else if (item.type === 'answer' && isRagAnswer(item.answer) && item.answer.status !== 'searched')
          answer = item.answer;
        else if (item.type === 'error')
          throw new RagStreamError('답변을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.');
        else throw new RagStreamError('답변의 출처와 실행 상태를 확인할 수 없습니다.');
      }
      if (done) break;
    }
    if (!answer || buffer.trim()) throw new RagStreamError('답변 연결이 완료 전에 끊어졌습니다. 다시 시도해 주세요.');
    return answer;
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
