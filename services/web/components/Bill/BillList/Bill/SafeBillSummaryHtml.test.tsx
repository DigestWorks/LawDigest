import { fireEvent, render, screen } from '@testing-library/react';
import type { CSSProperties } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SafeBillSummaryHtml from './SafeBillSummaryHtml';

describe('SafeBillSummaryHtml', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('요약 마크다운을 안전하게 렌더링한다', () => {
    render(
      <SafeBillSummaryHtml
        className="summary"
        markdown={'## 쉬운 요약\n- **핵심** 설명\n<script>alert(1)</script>'}
        style={{ '--lawdigest-summary-accent': '#152484' } as CSSProperties}
      />,
    );

    expect(screen.queryByRole('button', { name: '법안 요약 더 보기' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '쉬운 요약', level: 2 })).toBeInTheDocument();
    expect(screen.getByText('핵심')).toBeInTheDocument();
    expect(screen.queryByText('alert(1)', { selector: 'script' })).not.toBeInTheDocument();
    expect(screen.getByText('<script>alert(1)</script>')).toBeInTheDocument();
  });

  it('검색 결과 카드의 요약 제목을 법안 제목보다 한 단계 낮춘다', () => {
    render(<SafeBillSummaryHtml className="summary" markdown={'## 쉬운 요약\n### 항목'} sectionLevel={4} style={{}} />);

    expect(screen.getByRole('heading', { name: '쉬운 요약', level: 4 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '항목', level: 5 })).toBeInTheDocument();
  });

  it('본문에 버튼 역할을 주지 않고 용어 풀이만 버튼으로 제공한다', () => {
    render(
      <SafeBillSummaryHtml
        className="summary"
        markdown="{{청문:행정청이 처분 전에 의견을 듣는 절차}}"
        style={{ '--lawdigest-summary-accent': '#152484' } as CSSProperties}
      />,
    );

    fireEvent.click(screen.getByText('청문'));

    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getByRole('button', { name: /청문:/ })).toBeInTheDocument();
  });

  it('법령용어 툴팁 레이어를 화면 좌우 여백 안으로 보정한다', () => {
    vi.stubGlobal('innerWidth', 320);

    render(
      <SafeBillSummaryHtml
        className="summary"
        markdown="{{변상금:허가 없이 재산을 사용한 사람에게 부과하는 금액}}"
        style={{ '--lawdigest-summary-accent': '#152484' } as CSSProperties}
      />,
    );

    const term = screen.getByText('변상금');
    vi.spyOn(term, 'getBoundingClientRect').mockReturnValue({
      x: 292,
      y: 120,
      left: 292,
      top: 120,
      right: 316,
      bottom: 140,
      width: 24,
      height: 20,
      toJSON: () => {},
    });

    fireEvent.mouseEnter(term);

    expect(screen.getByRole('tooltip')).toHaveStyle({
      '--lawdigest-term-tooltip-left': '164px',
      '--lawdigest-term-tooltip-top': '148px',
    });
  });

  it('법령용어에서 마우스가 벗어나면 툴팁 레이어를 닫는다', () => {
    render(
      <SafeBillSummaryHtml
        className="summary"
        markdown="{{변상금:허가 없이 재산을 사용한 사람에게 부과하는 금액}}"
        style={{ '--lawdigest-summary-accent': '#152484' } as CSSProperties}
      />,
    );

    const term = screen.getByText('변상금');

    fireEvent.mouseEnter(term);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    fireEvent.mouseLeave(term, { relatedTarget: document.body });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('요약 영역 자체에 마우스가 올라가도 툴팁 레이어를 열지 않는다', () => {
    render(
      <SafeBillSummaryHtml
        className="summary"
        markdown="{{변상금:허가 없이 재산을 사용한 사람에게 부과하는 금액}}"
        style={{ '--lawdigest-summary-accent': '#152484' } as CSSProperties}
      />,
    );

    const summary = screen.getByText('변상금').closest('.summary')!;

    fireEvent.mouseEnter(summary);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('다른 법령용어에 마우스를 올리면 툴팁 내용을 새 단어 기준으로 갱신한다', () => {
    render(
      <SafeBillSummaryHtml
        className="summary"
        markdown="{{변상금:허가 없이 재산을 사용한 사람에게 부과하는 금액}}과 {{대부료:빌려 쓰는 대가로 내는 돈}}"
        style={{ '--lawdigest-summary-accent': '#152484' } as CSSProperties}
      />,
    );

    const firstTerm = screen.getByText('변상금');
    const secondTerm = screen.getByText('대부료');

    fireEvent.mouseEnter(firstTerm);
    expect(screen.getByRole('tooltip')).toHaveTextContent('허가 없이 재산을 사용한 사람에게 부과하는 금액');

    fireEvent.mouseEnter(secondTerm);
    expect(screen.getByRole('tooltip')).toHaveTextContent('빌려 쓰는 대가로 내는 돈');
  });
});
