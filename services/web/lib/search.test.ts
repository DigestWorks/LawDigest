import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildSearchHref,
  decodeSearchParam,
  readRecentSearches,
  saveRecentSearches,
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
});
