import Link from 'next/link';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { SectionError } from '@/components/common/SectionState';
import { useExploreRetryFocus } from './useExploreRetryFocus';

function ExploreRetry({ ready, refetch }: { ready: boolean; refetch: () => Promise<{ isSuccess: boolean }> }) {
  const { resultRef, retry } = useExploreRetryFocus(ready, refetch);
  return (
    <>
      {ready ? (
        <div ref={resultRef} tabIndex={-1} role="region" aria-label="분야 목록">
          <Link href="/explore/category/health">보건·의료</Link>
        </div>
      ) : (
        <SectionError message="분야 목록을 불러오지 못했습니다." onRetry={retry} pending={false} />
      )}
      <button type="button">다른 컨트롤</button>
    </>
  );
}

it('키보드 재시도 성공 후 복구된 목록부터 탐색한다', async () => {
  const user = userEvent.setup();
  const refetch = vi.fn().mockResolvedValue({ isSuccess: true });
  const { rerender } = render(<ExploreRetry ready={false} refetch={refetch} />);
  await user.tab();
  await user.keyboard('{Enter}');
  expect(refetch).toHaveBeenCalledOnce();

  rerender(<ExploreRetry ready refetch={refetch} />);
  expect(screen.getByRole('region', { name: '분야 목록' })).toHaveFocus();
  await user.tab();
  expect(screen.getByRole('link', { name: '보건·의료' })).toHaveFocus();
});

it('키보드 재시도 중 다른 컨트롤로 옮긴 포커스를 유지한다', async () => {
  const user = userEvent.setup();
  const refetch = vi.fn().mockResolvedValue({ isSuccess: true });
  const { rerender } = render(<ExploreRetry ready={false} refetch={refetch} />);
  await user.tab();
  await user.keyboard(' ');
  await user.tab();
  expect(refetch).toHaveBeenCalledOnce();

  rerender(<ExploreRetry ready refetch={refetch} />);
  expect(screen.getByRole('button', { name: '다른 컨트롤' })).toHaveFocus();
});

it('포인터 재시도 뒤에는 목록에 프로그램 방식으로 포커스를 두지 않는다', async () => {
  const user = userEvent.setup();
  const refetch = vi.fn().mockResolvedValue({ isSuccess: true });
  const { rerender } = render(<ExploreRetry ready={false} refetch={refetch} />);
  await user.click(screen.getByRole('button', { name: '다시 불러오기' }));
  expect(refetch).toHaveBeenCalledOnce();

  rerender(<ExploreRetry ready refetch={refetch} />);
  expect(screen.getByRole('region', { name: '분야 목록' })).not.toHaveFocus();
});
