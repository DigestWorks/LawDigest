import { render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import LegalDocument from './LegalDocument';
import { LEGAL_OPERATOR, PRIVACY_DOCUMENT, TERMS_DOCUMENT, type LegalDocumentData } from '@/constants/legal';
import { LEGAL_ARCHIVE } from '@/constants/legalArchive';

describe('LegalDocument', () => {
  afterEach(() => {
    LEGAL_ARCHIVE.terms = {};
  });

  it.each([TERMS_DOCUMENT, PRIVACY_DOCUMENT])('$title 목차가 모든 조항과 개정 이력으로 이동한다', (document) => {
    const { container } = render(<LegalDocument document={document} />);

    expect(screen.getByRole('heading', { level: 1, name: document.title })).toBeInTheDocument();
    const [contents] = screen.getAllByRole('navigation', { name: '목차' });
    const hrefs = within(contents)
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'));
    expect(hrefs).toEqual([...document.sections.map(({ id }) => `#${id}`), '#history']);
    [...document.sections, { id: 'history', title: '개정 이력' }].forEach(({ id, title }) => {
      expect(container.querySelector(`section#${id}`)).not.toBeNull();
      expect(screen.getByRole('heading', { level: 2, name: title })).toBeInTheDocument();
    });
  });

  it('현재 버전의 시행일과 개정 이력을 보여 준다', () => {
    render(<LegalDocument document={TERMS_DOCUMENT} />);

    const history = screen.getByRole('region', { name: '개정 이력' });
    const current = within(history).getByRole('listitem');
    expect(current).toHaveAttribute('aria-current', 'page');
    expect(within(current).getByText('2026년 11월 8일')).toHaveAttribute('datetime', '2026-11-08');
    expect(within(current).getByText('현재 버전')).toBeInTheDocument();
    expect(screen.queryByText('이전 버전')).not.toBeInTheDocument();
  });

  it('보관된 이전 버전은 표시와 현재 버전 링크를 보여 준다', () => {
    const previous: LegalDocumentData = {
      ...TERMS_DOCUMENT,
      effectiveDate: '2026년 11월 8일',
      effectiveDateTime: '2026-11-08',
      history: TERMS_DOCUMENT.history,
    };
    const next: LegalDocumentData = {
      ...TERMS_DOCUMENT,
      effectiveDate: '2027년 1월 1일',
      effectiveDateTime: '2027-01-01',
      history: [
        { effectiveDate: '2027년 1월 1일', effectiveDateTime: '2027-01-01', summary: '개정' },
        ...TERMS_DOCUMENT.history,
      ],
    };
    LEGAL_ARCHIVE.terms = { '2026-11-08': previous };

    render(<LegalDocument document={previous} current={next} />);

    expect(screen.getByText('이전 버전')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '현재 버전 보기' })).toHaveAttribute('href', '/terms');
    const rows = within(screen.getByRole('region', { name: '개정 이력' })).getAllByRole('listitem');
    expect(within(rows[0]).getByRole('link', { name: '2027년 1월 1일' })).toHaveAttribute('href', '/terms');
    expect(rows[1]).toHaveAttribute('aria-current', 'page');
    expect(within(rows[1]).queryByRole('link')).not.toBeInTheDocument();
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
