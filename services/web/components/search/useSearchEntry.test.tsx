import { act, renderHook } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import useSearchEntry from './useSearchEntry';
import { ragSubmissionState } from '@/store/RagConversationState';
import { readRecentSearches } from '@/lib/search';

const navigation = vi.hoisted(() => ({ pathname: '/', push: vi.fn() }));
vi.mock('next/navigation', () => ({ usePathname: () => navigation.pathname, useRouter: () => navigation }));
beforeEach(() => {
  navigation.pathname = '/';
  navigation.push.mockClear();
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  });
});
afterEach(() => vi.unstubAllGlobals());

it('keeps keyword navigation and recent searches', () => {
  const store = createStore();
  const { result } = renderHook(useSearchEntry, {
    wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
  });
  act(() => {
    expect(result.current.submit('  주거급여법  ')).toBe(true);
  });
  expect(navigation.push).toHaveBeenCalledWith('/search/%EC%A3%BC%EA%B1%B0%EA%B8%89%EC%97%AC%EB%B2%95');
  expect(readRecentSearches()).toEqual(['주거급여법']);
});

it('sends sentences to the search result page, where the AI answer starts, without a conversation hand-off', () => {
  const store = createStore();
  const { result } = renderHook(useSearchEntry, {
    wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
  });
  act(() => {
    expect(result.current.submit('전세사기 피해자 지원 법안은?')).toBe(true);
  });
  expect(navigation.push).toHaveBeenCalledExactlyOnceWith(
    `/search/${encodeURIComponent('전세사기 피해자 지원 법안은?')}`,
  );
  expect(store.get(ragSubmissionState)).toBeNull();
});

it('shares the draft between desktop and mobile and keeps the bar open only on search results', () => {
  navigation.pathname = '/search/%EC%9E%84%EC%B0%A8%EB%A3%8C';
  const store = createStore();
  const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;
  const desktop = renderHook(useSearchEntry, { wrapper });
  const mobile = renderHook(useSearchEntry, { wrapper });
  act(() => desktop.result.current.setDraft('임차료 지원'));
  expect(mobile.result.current.draft).toBe('임차료 지원');
  expect(mobile.result.current.expanded).toBe(true);
  navigation.pathname = '/ask';
  mobile.rerender();
  expect(mobile.result.current.expanded).toBe(false);
});
