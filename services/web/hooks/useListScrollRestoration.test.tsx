import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useListScrollRestoration } from './useListScrollRestoration';

describe('목록 읽던 위치 복원', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('상세 이동 중 맨 위로 스크롤되어도 목록에서 읽던 위치를 복원한다', () => {
    const values = new Map<string, string>();
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    });
    let frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const flushFrames = () => {
      for (let i = 0; i < 2; i += 1) {
        const pending = frames;
        frames = [];
        pending.forEach((callback) => callback(0));
      }
    };
    const scrollTo = vi.fn();
    vi.stubGlobal('scrollTo', scrollTo);
    vi.stubGlobal('scrollY', 0);
    const first = renderHook(() => useListScrollRestoration('feed', true));
    act(flushFrames);
    vi.stubGlobal('scrollY', 1692);
    act(() => window.dispatchEvent(new Event('scroll')));
    const link = document.createElement('a');
    link.href = '/bill/sample';
    link.addEventListener('click', (event) => event.preventDefault());
    document.body.appendChild(link);
    act(() => link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })));
    vi.stubGlobal('scrollY', 0);
    act(() => window.dispatchEvent(new Event('scroll')));
    first.unmount();
    link.remove();
    const second = renderHook(() => useListScrollRestoration('feed', true));
    act(flushFrames);
    expect(scrollTo).toHaveBeenCalledWith(0, 1692);
    second.unmount();
  });
});
