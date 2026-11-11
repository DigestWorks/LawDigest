import { describe, expect, it } from 'vitest';
import { isRagAnswer, unavailableStatus, type RagSource } from '@/lib/rag';
import { getPartyColor } from '@/constants/party';
import { answerAccent, answerFocus, orbLayers } from './answerAccent';

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
    expect(answerFocus(sources)).toMatchObject({ kind: 'member', count: 2 });
  });

  it('같은 정당 여러 의원이면 정당 카드', () => {
    const sources = [source('S1', person('M1', '국민의힘')), source('S2', person('M2', '국민의힘'))];
    expect(answerFocus(sources)).toMatchObject({ kind: 'party', count: 2 });
  });

  it('정당이 섞이거나 공동대표발의가 있으면 중립색이고 카드가 없다', () => {
    const mixed = [source('S1', person('M1', '국민의힘')), source('S2', person('M2', '더불어민주당'))];
    expect(answerAccent(mixed).party).toBeNull();
    expect(answerAccent(mixed).color).toBe(getPartyColor(null));
    expect(answerFocus([source('S1', person('M1', '국민의힘')), source('S2', null)])).toBeNull();
  });
});

describe('구체 7겹 색', () => {
  const red = getPartyColor('국민의힘');
  const navy = getPartyColor('더불어민주당');
  const gray = getPartyColor(null);

  it('근거가 없으면 무지개 네 색을 돌려 쓴다', () => {
    expect(orbLayers([])).toEqual(['#FC56D8', '#10D9EF', '#FBEB59', '#6CF880', '#FC56D8', '#10D9EF', '#FBEB59']);
  });

  it('정당 분포 비율로 겹을 나누고 같은 색을 번갈아 놓는다', () => {
    const sources = [
      ...['S1', 'S2', 'S3', 'S4'].map((key, i) => source(key, person(`R${i}`, '국민의힘'))),
      ...['S5', 'S6'].map((key, i) => source(key, person(`N${i}`, '더불어민주당'))),
      source('S7', null),
    ];
    const layers = orbLayers(sources);
    expect(layers).toEqual([red, navy, red, gray, red, navy, red]);
  });

  it('한 정당이면 그 정당색과 같은 색의 밝은·짙은 톤만 쓴다', () => {
    const layers = orbLayers([source('S1', person('M1', '국민의힘'))]);
    expect(layers[0]).toBe(red);
    expect(new Set(layers).size).toBe(3);
    expect(layers.filter((color) => color === red)).toHaveLength(3);
  });

  it('적은 정당도 최소 한 겹을 받는다', () => {
    const sources = [
      ...['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7'].map((key, i) => source(key, person(`R${i}`, '국민의힘'))),
      source('S8', person('N1', '더불어민주당')),
    ];
    expect(orbLayers(sources).filter((color) => color === navy)).toHaveLength(1);
  });
});
