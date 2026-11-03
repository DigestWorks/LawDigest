import { koreaDateKey } from '@/lib/dataFreshness';

export type TrendPoint = { month: string; proposed: number | null; passed?: number | null };

export function currentAssemblyMonths(now = new Date()) {
  const [year, month] = koreaDateKey(now).split('-').map(Number);
  return Math.max(1, (year - 2024) * 12 + month - 5 + 1);
}

export function fillTrendCalendar(rows: TrendPoint[], months: number, now = new Date()): TrendPoint[] {
  const [year, month] = koreaDateKey(now).split('-').map(Number);
  const byMonth = new Map(rows.map((row) => [row.month, row]));
  return Array.from({ length: months }, (_, index) => {
    const key = new Date(Date.UTC(year, month - months + index, 1)).toISOString().slice(0, 7);
    return byMonth.get(key) ?? { month: key, proposed: null, passed: null };
  });
}
