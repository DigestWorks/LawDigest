import { expect, it, vi } from 'vitest';
import { readRagStream } from './ragStream';
import { unavailableStatus } from './rag';

const answer = {
  status: 'insufficient_evidence',
  paragraphs: [],
  sources: [],
  limitations: ['근거 부족'],
  metadata: unavailableStatus,
};
const step = { id: '1', name: 'search', status: 'complete', summary: '법안 확인 완료' };
const frame = (event: unknown) => `data: ${JSON.stringify(event)}\n\n`;
const response = (text: string) => new Response(text, { headers: { 'Content-Type': 'text/event-stream' } });

it('reassembles Korean UTF-8 and SSE frames split at every byte', async () => {
  const bytes = new TextEncoder().encode(
    `: keepalive\n\n${frame({ type: 'step', step })}${frame({ type: 'answer', answer })}`,
  );
  const body = new ReadableStream({
    start(controller) {
      for (const byte of bytes) controller.enqueue(new Uint8Array([byte]));
      controller.close();
    },
  });
  const onStep = vi.fn();
  expect(await readRagStream(new Response(body, { headers: { 'Content-Type': 'text/event-stream' } }), onStep)).toEqual(
    answer,
  );
  expect(onStep).toHaveBeenCalledExactlyOnceWith(step);
});

it.each([
  frame({ type: 'step', step }),
  'data: {"type":"answer"',
  frame({
    type: 'answer',
    answer: { ...answer, status: 'answered', paragraphs: [{ text: '주장', source_keys: ['S9'] }] },
  }),
  frame({ type: 'step', step: { ...step, id: '99' } }),
  frame({ type: 'answer', answer }) + frame({ type: 'answer', answer }),
])('rejects incomplete or invalid streams', async (text) => {
  await expect(readRagStream(response(text), vi.fn())).rejects.toThrow();
});

it('hides internal errors and cancels the reader on invalid data', async () => {
  const cancel = vi.fn();
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(frame({ type: 'error', message: 'private secret' })));
    },
    cancel,
  });
  await expect(
    readRagStream(new Response(body, { headers: { 'Content-Type': 'text/event-stream' } }), vi.fn()),
  ).rejects.toThrow('답변을 만들지 못했습니다');
  expect(cancel).toHaveBeenCalledOnce();
});
