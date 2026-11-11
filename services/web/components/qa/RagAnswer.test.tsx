import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { unavailableStatus, type RagSource } from '@/lib/rag';
import RagAnswer from './RagAnswer';

const source = (n: number): RagSource => ({
  key: `S${n}`,
  bill_id: `PRC_${n}`,
  bill_name: `법안 ${n} 일부개정법률안`,
  assembly: 22,
  propose_date: '2026-11-09',
  stage: '접수',
  result: null,
  excerpt: '원문',
  detail_url: `/bill/PRC_${n}`,
  official_url: 'https://likms.assembly.go.kr',
});

it('한 문단의 근거 번호는 세 개까지 보이고 나머지는 +N으로 펼친다', () => {
  const sources = [1, 2, 3, 4, 5].map(source);
  render(
    <RagAnswer
      turnId="t"
      answer={{
        status: 'answered',
        paragraphs: [{ text: '살펴본 법안 5건은 …입니다.', source_keys: sources.map((item) => item.key) }],
        sources,
        limitations: [],
        metadata: unavailableStatus,
      }}
    />,
  );
  expect(screen.getAllByText(/번 근거,/)).toHaveLength(3);
  fireEvent.click(screen.getByRole('button', { name: '근거 2건 더 보기' }));
  expect(screen.getAllByText(/번 근거,/)).toHaveLength(5);
});
