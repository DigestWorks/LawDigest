import { describe, expect, it } from 'vitest';
import { sortPartiesIndependentLast } from './partyOrder';

const sort = (rows: { name: string; count: number }[]) =>
  sortPartiesIndependentLast(
    rows,
    (row) => row.name,
    (row) => row.count,
  ).map((row) => row.name);

describe('sortPartiesIndependentLast', () => {
  it('무소속을 의석 수와 관계없이 맨 뒤에 둔다', () => {
    expect(
      sort([
        { name: '진보당', count: 4 },
        { name: '무소속', count: 8 },
        { name: '더불어민주당', count: 161 },
        { name: '기본소득당', count: 1 },
      ]),
    ).toEqual(['더불어민주당', '진보당', '기본소득당', '무소속']);
  });

  it('원본 배열을 바꾸지 않는다', () => {
    const rows = [
      { name: '무소속', count: 8 },
      { name: '진보당', count: 4 },
    ];
    sort(rows);
    expect(rows[0].name).toBe('무소속');
  });
});
