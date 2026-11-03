import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import ProcessResult from './ProcessResult';

vi.mock('@heroui/react', () => ({
  Card: ({ children }: { children: ReactNode }) => <section>{children}</section>,
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardBody: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/common/Chart/HalfDonutChart', () => ({
  default: () => <svg role="img" aria-label="표결 차트" />,
}));

describe('법안 처리 결과', () => {
  it('가결 결과를 유지하면서 미수집 표결 차트를 숨긴다', () => {
    render(<ProcessResult bill_result="원안가결" approval_count={null} total_vote_count={null} party_vote_list={[]} />);
    expect(screen.getByText('원안가결')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '원안가결' })).not.toBeInTheDocument();
    expect(screen.getByText('본회의 표결 기록 미수집')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('복합 가결 기록을 확인이 필요한 결과로 표시한다', () => {
    render(
      <ProcessResult
        bill_result="수정가결 원안가결"
        billStage="체계자구 심사"
        approval_count={null}
        total_vote_count={null}
        party_vote_list={[]}
      />,
    );
    expect(screen.getByText('결과 확인 필요')).toBeInTheDocument();
    expect(screen.queryByText('수정가결 원안가결')).not.toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('찬성 0표를 미수집으로 취급하지 않는다', () => {
    render(<ProcessResult bill_result="부결" approval_count={0} total_vote_count={232} party_vote_list={[]} />);
    expect(screen.getByRole('img', { name: '표결 차트' })).toBeInTheDocument();
    expect(screen.getByText('찬성 0표 · 총 투표 232표')).toBeInTheDocument();
  });

  it('총 투표수보다 큰 찬성 수를 차트로 표시하지 않는다', () => {
    render(<ProcessResult bill_result="수정가결" approval_count={250} total_vote_count={232} party_vote_list={[]} />);
    expect(screen.getByText('표결 수치를 확인하고 있습니다.')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('진행 중 법안에 표결 미수집이라는 설명을 붙이지 않는다', () => {
    render(<ProcessResult billStage="접수" approval_count={null} total_vote_count={null} party_vote_list={[]} />);
    expect(screen.getByText('아직 본회의 처리 결과가 없습니다.')).toBeInTheDocument();
  });
});
