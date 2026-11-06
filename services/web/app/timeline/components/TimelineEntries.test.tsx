import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it } from 'vitest';
import type { TimelineBill } from '@/types';
import { BillSection, CommitteeSection, PlenarySection } from './TimelineEntries';

beforeEach(() => {
  window.innerWidth = 375;
});

const bill = (id: number, extra: Partial<TimelineBill> = {}): TimelineBill => ({
  bill_id: `B${id}`,
  bill_name: `법안 ${id}`,
  bill_stage: '접수',
  bill_proposers: '손솔의원 등 12인',
  bill_title: null,
  party_info: [{ party_id: 9, party_name: '진보당', party_image_url: '/party/wide/9.png' }],
  ...extra,
});

it('넘김 버튼으로 다음 법안을 보여 주고 처음으로 돌아간다', async () => {
  const user = userEvent.setup();
  render(<BillSection title="법안 접수" countLabel="접수된 법안" bills={[bill(1), bill(2)]} />);
  expect(screen.getByText('법안 1')).toBeInTheDocument();
  expect(screen.getByText('손솔 의원 등 12인')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: '법안 접수 다음 목록' }));
  expect(screen.getByText('법안 2')).toBeInTheDocument();
  expect(screen.queryByText('법안 1')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: '법안 접수 다음 목록' }));
  expect(screen.getByText('법안 1')).toBeInTheDocument();
});

it('한 페이지뿐이면 넘김 버튼을 숨긴다', () => {
  render(<BillSection title="법안 접수" countLabel="접수된 법안" bills={[bill(1)]} />);
  expect(screen.queryByRole('button', { name: '법안 접수 다음 목록' })).not.toBeInTheDocument();
});

it('전체 보기 모달은 모든 법안의 상세 링크를 연다', async () => {
  const user = userEvent.setup();
  render(<BillSection title="법안 공포" countLabel="공포한 법안" bills={[bill(1), bill(2), bill(3)]} />);
  await user.click(screen.getByRole('button', { name: '법안 공포 전체 보기' }));
  const dialog = await screen.findByRole('dialog');
  expect(within(dialog).getByRole('link', { name: '법안 3' })).toHaveAttribute('href', '/bill/B3');
});

it('정당 정보가 없는 정부·위원장 법안도 표시한다', () => {
  render(<BillSection title="법안 접수" countLabel="접수된 법안" bills={[bill(1, { party_info: [] })]} />);
  expect(screen.getByRole('link', { name: '법안 1' })).toBeInTheDocument();
});

it('위원회마다 자기 법안만 모달로 연다', async () => {
  const user = userEvent.setup();
  render(
    <CommitteeSection
      committees={[
        {
          committee_name: '국방위원회',
          bill_count: 6,
          bill_outline_dto_list: [1, 2, 3, 4, 5, 6].map((id) => bill(id)),
        },
        { committee_name: '교육위원회', bill_count: 1, bill_outline_dto_list: [bill(7)] },
      ]}
    />,
  );
  expect(screen.queryByRole('link', { name: '법안 6' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: '국방위원회 전체 보기' }));
  const dialog = await screen.findByRole('dialog');
  expect(within(dialog).getByRole('link', { name: '법안 6' })).toBeInTheDocument();
  expect(within(dialog).queryByRole('link', { name: '법안 7' })).not.toBeInTheDocument();
});

it('본회의 모달은 같은 법안을 합치고 결과별로 묶는다', async () => {
  const user = userEvent.setup();
  const entry = (id: number, result: string | null) => ({
    bill_info: bill(id, { bill_result: result }),
    approval_vote_count: null,
    total_vote_count: null,
    party_vote_list: [],
  });
  render(<PlenarySection entries={[entry(1, '원안가결'), entry(1, '원안가결'), entry(2, '철회'), entry(3, null)]} />);
  expect(screen.getByText('3개')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: '본회의 심의 전체 보기' }));
  const dialog = await screen.findByRole('dialog');
  expect(within(dialog).getByRole('heading', { name: /가결/ })).toBeInTheDocument();
  expect(within(dialog).getByRole('heading', { name: /철회/ })).toBeInTheDocument();
  expect(within(dialog).getByRole('heading', { name: /결과 기록 없음/ })).toBeInTheDocument();
});
