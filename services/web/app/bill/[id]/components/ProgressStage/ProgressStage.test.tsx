import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ProgressStage from './ProgressStage';

describe('법안 단계 표시', () => {
  it.each(['정부이송', '체계자구 심사'])('%s API 값을 해당 현재 단계로 표시한다', (stage) => {
    render(<ProgressStage billStage={stage} />);
    const label = stage === '체계자구 심사' ? '체계·자구 심사' : stage;
    expect(screen.getByText(label).closest('li')).toHaveAttribute('aria-current', 'step');
  });

  it('알 수 없는 값을 위원회 심사로 대체하지 않는다', () => {
    render(<ProgressStage billStage="새로운 단계" />);
    expect(screen.getByText('새로운 단계')).toBeInTheDocument();
    expect(screen.queryByText('위원회 심사')).not.toBeInTheDocument();
  });

  it('폐기 결과를 진행 중 단계와 구분한다', () => {
    const { container } = render(<ProgressStage billStage="위원회 심사" billResult="임기만료폐기" />);
    expect(screen.getByText('임기만료폐기 · 처리 종료')).toBeInTheDocument();
    expect(container.querySelector('[aria-current="step"]')).not.toBeInTheDocument();
  });
});
