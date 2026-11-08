import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildSearchHref,
  decodeSearchParam,
  readRecentSearches,
  saveRecentSearches,
  rememberSearch,
  highlightParts,
  RECENT_SEARCH_KEY,
} from './search';

describe('검색 경로와 기록', () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => values.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        values.set(key, value);
      }),
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('한글과 예약문자를 경로 한 부분으로 전달하고 한 번 해석한다', () => {
    const keyword = '의료법 R&D / #?';
    const href = buildSearchHref(keyword);
    expect(href.slice('/search/'.length)).not.toContain('/');
    expect(decodeSearchParam(href.slice('/search/'.length))).toBe(keyword);
  });

  it('퍼센트 문자열을 반복해서 해석하지 않는다', () => {
    expect(decodeSearchParam('%2526')).toBe('%26');
    expect(decodeSearchParam('%EC')).toBe('%EC');
  });

  it('기존 검색 기록을 최근 순서로 보존하고 새 기록은 순서를 유지한다', () => {
    localStorage.setItem('recentKeywords', JSON.stringify(['옛 검색', '최근 검색']));
    expect(readRecentSearches()).toEqual(['최근 검색', '옛 검색']);
    saveRecentSearches(['새 검색', '최근 검색']);
    expect(JSON.parse(localStorage.getItem(RECENT_SEARCH_KEY)!)).toEqual(['새 검색', '최근 검색']);
    expect(readRecentSearches()).toEqual(['새 검색', '최근 검색']);
  });

  it('저장 공간 사용이 제한돼도 검색 기록 저장이 예외를 전파하지 않는다', () => {
    vi.mocked(localStorage.setItem).mockImplementation(() => {
      throw new Error('storage denied');
    });
    expect(() => saveRecentSearches(['의료법'])).not.toThrow();
  });

  it('다시 검색한 검색어를 맨 앞으로 옮기고 10개까지 남긴다', () => {
    saveRecentSearches(Array.from({ length: 10 }, (_, index) => `검색${index}`));
    expect(rememberSearch('검색5')[0]).toBe('검색5');
    const values = rememberSearch('새 검색');
    expect(values[0]).toBe('새 검색');
    expect(values).toHaveLength(10);
    expect(new Set(values).size).toBe(10);
  });
});

describe('검색어 일치 표시', () => {
  it('여러 단어와 대소문자 차이를 함께 표시한다', () => {
    expect(highlightParts('주택임대차보호법 R&D 개정', '주택 r&d')).toEqual([
      { text: '주택', match: true },
      { text: '임대차보호법 ', match: false },
      { text: 'R&D', match: true },
      { text: ' 개정', match: false },
    ]);
  });

  it('정규식 예약문자를 글자 그대로 찾는다', () => {
    expect(highlightParts('제(1)조', '(1)')).toEqual([
      { text: '제', match: false },
      { text: '(1)', match: true },
      { text: '조', match: false },
    ]);
  });

  it('검색어가 비어 있으면 원문 한 덩어리를 돌려준다', () => {
    expect(highlightParts('의료법', '  ')).toEqual([{ text: '의료법', match: false }]);
    expect(highlightParts('', '의료')).toEqual([]);
  });
});
