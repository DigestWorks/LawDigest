import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { TimelineBillList } from './TimelineEntries';

it('키보드로 펼친 첫 법안에 초점을 두고 접으면 더 보기로 돌아간다', async () => {
  const user = userEvent.setup();
  const bills = Array.from({ length: 29 }, (_, index) => ({
    bill_id: String(index + 1),
    bill_name: `법안 ${index + 1}`,
    bill_stage: null,
    bill_proposers: null,
    bill_title: null,
  }));
  render(<TimelineBillList title="접수된 법안" bills={bills} />);

  await user.tab();
  await user.tab();
  await user.tab();
  await user.tab();
  expect(screen.getByRole('button', { name: '접수된 법안 법안 20건 더 보기' })).toHaveFocus();
  await user.keyboard('{Enter}');
  expect(screen.getByRole('link', { name: '법안 4' })).toHaveFocus();

  for (let index = 0; index < 20; index += 1) await user.tab();
  expect(screen.getByRole('button', { name: '접수된 법안 법안 6건 더 보기' })).toHaveFocus();
  await user.keyboard(' ');
  expect(screen.getByRole('link', { name: '법안 24' })).toHaveFocus();

  for (let index = 0; index < 6; index += 1) await user.tab();
  expect(screen.getByRole('button', { name: '접수된 법안 접기' })).toHaveFocus();
  await user.keyboard('{Enter}');
  expect(screen.getByRole('button', { name: '접수된 법안 법안 20건 더 보기' })).toHaveFocus();
  expect(screen.getAllByRole('link')).toHaveLength(3);
});
