export const SEARCH_MAX_LENGTH = 200;
export const RECENT_SEARCH_KEY = 'lawdigest:recent-searches:v2';

export function normalizeSearch(value: string) {
  return value.trim().slice(0, SEARCH_MAX_LENGTH);
}

export function buildSearchHref(value: string) {
  return `/search/${encodeURIComponent(normalizeSearch(value))}`;
}

export function decodeSearchParam(value: string) {
  try {
    return normalizeSearch(decodeURIComponent(value));
  } catch {
    return normalizeSearch(value);
  }
}

export function canSearchBills(value: string) {
  return Array.from(value.trim()).length >= 2 && /[\p{L}\p{N}]/u.test(value);
}

export function readRecentSearches(): string[] {
  try {
    const current = localStorage.getItem(RECENT_SEARCH_KEY);
    const stored: unknown = JSON.parse(current ?? localStorage.getItem('recentKeywords') ?? '[]');
    if (!current && Array.isArray(stored)) stored.reverse();
    return Array.isArray(stored) ? stored.filter((item): item is string => typeof item === 'string').slice(0, 10) : [];
  } catch {
    return [];
  }
}

export function saveRecentSearches(values: string[]) {
  try {
    localStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify(values.slice(0, 10)));
  } catch {
    // 저장 공간이 제한되어도 검색은 계속 사용할 수 있다.
  }
}

export function rememberSearch(keyword: string) {
  const values = [keyword, ...readRecentSearches().filter((value) => value !== keyword)].slice(0, 10);
  saveRecentSearches(values);
  return values;
}

export interface HighlightPart {
  text: string;
  match: boolean;
}

/** 검색어를 공백 단위로 나눠, 원문에서 일치하는 구간을 표시할 수 있게 자른다. */
export function highlightParts(text: string, keyword: string): HighlightPart[] {
  const terms = Array.from(new Set(keyword.normalize('NFC').trim().split(/\s+/u).filter(Boolean))).sort(
    (a, b) => b.length - a.length,
  );
  if (!text || terms.length === 0) return text ? [{ text, match: false }] : [];
  const pattern = new RegExp(`(${terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')).join('|')})`, 'giu');
  return text
    .normalize('NFC')
    .split(pattern)
    .filter(Boolean)
    .map((part) => ({
      text: part,
      match: terms.some((term) => term.toLocaleLowerCase() === part.toLocaleLowerCase()),
    }));
}
