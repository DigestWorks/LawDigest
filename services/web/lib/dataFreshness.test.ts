import { expect, it } from 'vitest';
import { daysSinceDataDate, isoDateOnly, koreaDateKey, proposalDateLabel } from './dataFreshness';

it('uses Korea calendar dates at the UTC year boundary', () => {
  const now = new Date('2025-12-31T15:01:00Z');
  expect(koreaDateKey(now)).toBe('2026-01-01');
  expect(proposalDateLabel('2025-12-31', now)).toBe('2025년 12월 31일 발의');
  expect(proposalDateLabel('2026-01-01', now)).toBe('1월 1일 발의');
  expect(daysSinceDataDate('2025-12-31', now)).toBe(1);
});

it('keeps missing or impossible dates unknown', () => {
  expect(isoDateOnly('2026-02-30')).toBeNull();
  expect(isoDateOnly('2024-02-29T00:00:00')).toBe('2024-02-29');
  expect(daysSinceDataDate(null)).toBeNull();
  expect(proposalDateLabel('')).toBe('발의일 확인 중');
});
