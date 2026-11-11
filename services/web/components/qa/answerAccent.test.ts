import { describe, expect, it } from 'vitest';
import { isRagAnswer, unavailableStatus, type RagSource } from '@/lib/rag';
import { getPartyColor } from '@/constants/party';
import { answerAccent, answerFocus } from './answerAccent';

const person = (congressman_id: string, party: string | null) => ({
  name: `의원${congressman_id}`,
  congressman_id,
  image_url: `/congressman/22/${congressman_id}.jpg`,
  party,
  party_id: party === '국민의힘' ? 2 : 1,
  party_image_url: '/party/wide/2.png',
});
const source = (key: string, representative: RagSource['representative']): RagSource => ({
  key,
  bill_id: `PRC_${key}`,
  bill_name: '주택법 일부개정법률안',
  assembly: 22,
  propose_date: '2026-11-09',
  stage: '접수',
  result: null,
  excerpt: '원문',
  detail_url: `/bill/PRC_${key}`,
  official_url: 'https://likms.assembly.go.kr',
  proposer_label: representative ? `${representative.name} 의원` : null,
  representative,
});
const answer = (sources: RagSource[]) => ({
  status: 'answered',
  paragraphs: [{ text: '설명', source_keys: sources.map((item) => item.key) }],
  sources,
  limitations: [],
  metadata: unavailableStatus,
});

describe('근거 발의자 검증', () => {
  it('발의자 필드가 없거나 있어도 받는다', () => {
    expect(isRagAnswer(answer([source('S1', undefined)]))).toBe(true);
    expect(isRagAnswer(answer([source('S1', person('M1', '국민의힘'))]))).toBe(true);
  });

  it('이미지 서버 상대 경로가 아닌 사진 주소는 거른다', () => {
    const bad = { ...person('M1', '국민의힘'), image_url: 'javascript:alert(1)' };
    expect(isRagAnswer(answer([source('S1', bad)]))).toBe(false);
  });
});

describe('정당색 포인트와 주인공', () => {
  it('한 의원의 법안이면 그 정당색과 의원 카드', () => {
    const sources = [source('S1', person('M1', '국민의힘')), source('S2', person('M1', '국민의힘'))];
    expect(answerAccent(sources)).toEqual({ party: '국민의힘', color: getPartyColor('국민의힘') });
    expect(answerFocus(sources, '의원M1 의원')).toMatchObject({ kind: 'member', count: 2 });
  });

  it('같은 정당 여러 의원이면 정당 카드', () => {
    const sources = [source('S1', person('M1', '국민의힘')), source('S2', person('M2', '국민의힘'))];
    expect(answerFocus(sources, '국민의힘')).toMatchObject({ kind: 'party', count: 2 });
    expect(answerFocus(sources, '국힘 법안')).toMatchObject({ kind: 'party' });
    // 근거가 우연히 한 정당뿐인 주제 검색에는 카드를 두지 않는다.
    expect(answerFocus(sources, '법률용어')).toBeNull();
  });

  it('정당이 섞이거나 공동대표발의가 있으면 중립색이고 카드가 없다', () => {
    const mixed = [source('S1', person('M1', '국민의힘')), source('S2', person('M2', '더불어민주당'))];
    expect(answerAccent(mixed).party).toBeNull();
    expect(answerAccent(mixed).color).toBe(getPartyColor(null));
    expect(answerFocus([source('S1', person('M1', '국민의힘')), source('S2', null)])).toBeNull();
  });
});
