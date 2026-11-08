import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LegalDocument from './LegalDocument';
import { LEGAL_OPERATOR, PRIVACY_DOCUMENT, TERMS_DOCUMENT } from '@/constants/legal';

describe('LegalDocument', () => {
  it.each([TERMS_DOCUMENT, PRIVACY_DOCUMENT])('$title 목차가 모든 조항으로 이동한다', (document) => {
    const { container } = render(<LegalDocument document={document} />);

    expect(screen.getByRole('heading', { level: 1, name: document.title })).toBeInTheDocument();
    expect(screen.getByText(LEGAL_OPERATOR.effectiveDate)).toHaveAttribute(
      'datetime',
      LEGAL_OPERATOR.effectiveDateTime,
    );

    const [contents] = screen.getAllByRole('navigation', { name: '목차' });
    const hrefs = within(contents)
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'));
    expect(hrefs).toEqual(document.sections.map(({ id }) => `#${id}`));
    document.sections.forEach(({ id, title }) => {
      expect(container.querySelector(`section#${id}`)).not.toBeNull();
      expect(screen.getByRole('heading', { level: 2, name: title })).toBeInTheDocument();
    });
  });

  it('처리방침에 보호책임자 연락처와 국외 이전 표를 보여 준다', () => {
    render(<LegalDocument document={PRIVACY_DOCUMENT} />);

    const officerTable = screen.getByRole('table', { name: '개인정보 보호책임자' });
    expect(within(officerTable).getByRole('link', { name: LEGAL_OPERATOR.privacyOfficer.email })).toHaveAttribute(
      'href',
      `mailto:${LEGAL_OPERATOR.privacyOfficer.email}`,
    );
    const overseas = screen.getByRole('table', { name: '개인정보 국외 이전 내용' });
    expect(within(overseas).getByRole('rowheader', { name: '거부 방법과 효과' })).toBeInTheDocument();
    expect(within(overseas).getByRole('link', { name: 'privacy.openai.com' })).toHaveAttribute('target', '_blank');
  });

  it('약관에 만 14세 미만 가입 제한을 적는다', () => {
    render(<LegalDocument document={TERMS_DOCUMENT} />);

    expect(screen.getByText('만 14세 미만은 회원으로 가입할 수 없습니다.')).toBeInTheDocument();
  });
});
