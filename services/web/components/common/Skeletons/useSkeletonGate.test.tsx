import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { SKELETON_APPEAR_DELAY_MS, SKELETON_MIN_VISIBLE_MS, useSkeletonGate } from './useSkeletonGate';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
});

afterEach(() => {
  vi.useRealTimers();
});

const renderGate = () => renderHook(({ loading }) => useSkeletonGate(loading), { initialProps: { loading: true } });

it('등장 지연보다 짧은 로딩은 끝나는 즉시 스켈레톤을 내린다', () => {
  const { result, rerender } = renderGate();
  expect(result.current).toBe(true);

  act(() => vi.advanceTimersByTime(SKELETON_APPEAR_DELAY_MS - 100));
  rerender({ loading: false });

  expect(result.current).toBe(false);
});

it('스켈레톤이 나타난 뒤 로딩이 끝나면 최소 표시 시간까지 유지한다', () => {
  const { result, rerender } = renderGate();

  act(() => vi.advanceTimersByTime(SKELETON_APPEAR_DELAY_MS + 50));
  rerender({ loading: false });
  expect(result.current).toBe(true);

  act(() => vi.advanceTimersByTime(SKELETON_MIN_VISIBLE_MS - 51));
  expect(result.current).toBe(true);

  act(() => vi.advanceTimersByTime(2));
  expect(result.current).toBe(false);
});

it('최소 표시 시간을 이미 넘긴 긴 로딩은 끝나는 즉시 내용을 보인다', () => {
  const { result, rerender } = renderGate();

  act(() => vi.advanceTimersByTime(SKELETON_APPEAR_DELAY_MS + SKELETON_MIN_VISIBLE_MS + 100));
  rerender({ loading: false });

  expect(result.current).toBe(false);
});
