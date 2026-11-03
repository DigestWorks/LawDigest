import { expect, it } from 'vitest';
import { currentAssemblyMonths, fillTrendCalendar } from './trendCalendar';

const nov = new Date('2026-11-03T01:00:00Z');

it('does not turn uncollected months into zero activity or hide recent calendar months', () => {
  const points = fillTrendCalendar([{ month: '2026-07', proposed: 250, passed: 0 }], 5, nov);
  expect(points[0]).toEqual({ month: '2026-07', proposed: 250, passed: 0 });
  expect(points.slice(1)).toEqual(
    ['08', '09', '10', '11'].map((m) => ({ month: `2026-${m}`, proposed: null, passed: null })),
  );
});

it('includes every calendar month since the start of the 22nd Assembly', () => {
  const points = fillTrendCalendar([], currentAssemblyMonths(nov), nov);
  expect(points[0].month).toBe('2024-05');
  expect(points.at(-1)?.month).toBe('2026-11');
});
