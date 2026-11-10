import { act, renderHook } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import useSearchEntry from './useSearchEntry';
import { searchModeState } from '@/store/SearchEntryState';
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

it.each(['search', 'chat'] as const)(
  'hands %s to the conversation without putting questions in URLs or history',
  (mode) => {
    const store = createStore();
    store.set(searchModeState, mode);
    const { result } = renderHook(useSearchEntry, {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });
    const question = '청년 주거 지원의 요건을 비교해 주세요. '.repeat(15);
    act(() => {
      expect(result.current.submit(question)).toBe(true);
      expect(result.current.submit(question)).toBe(false);
    });
    expect(navigation.push).toHaveBeenCalledExactlyOnceWith('/ask');
    expect(store.get(ragSubmissionState)).toMatchObject({ question: question.trim(), mode });
    expect(readRecentSearches()).toEqual([]);
  },
);

it('shares draft and mode between desktop and mobile and keeps the bar open on /ask', () => {
  navigation.pathname = '/ask';
  const store = createStore();
  const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;
  const desktop = renderHook(useSearchEntry, { wrapper });
  const mobile = renderHook(useSearchEntry, { wrapper });
  act(() => {
    desktop.result.current.setDraft('임차료 지원');
    desktop.result.current.setMode('search');
  });
  expect(mobile.result.current.draft).toBe('임차료 지원');
  expect(mobile.result.current.mode).toBe('search');
  expect(mobile.result.current.expanded).toBe(true);
});
