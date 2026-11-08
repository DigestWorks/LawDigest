'use client';

import { LayoutGroup, motion, useReducedMotion } from 'framer-motion';

export const RESULT_TYPES = [
  { value: 'all', label: '전체' },
  { value: 'bill', label: '법안' },
  { value: 'member', label: '의원' },
  { value: 'party', label: '정당' },
] as const;
export type ResultType = (typeof RESULT_TYPES)[number]['value'];

export default function SearchTypeTabs({
  selected,
  counts,
  onSelect,
}: {
  selected: ResultType;
  counts: Record<ResultType, string>;
  onSelect: (type: ResultType) => void;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <LayoutGroup id="search-result-type">
      <div className="flex gap-1 overflow-x-auto scrollbar-hide" role="group" aria-label="검색 결과 유형">
        {RESULT_TYPES.map(({ value, label }) => {
          const active = selected === value;
          const empty = counts[value] === '0';
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(value)}
              className={`relative h-9 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                active
                  ? 'text-white dark:text-primary-3'
                  : `hover:bg-accent ${empty ? 'text-muted-foreground' : 'text-foreground'}`
              }`}>
              {active && (
                <motion.span
                  layoutId="search-result-type-cursor"
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full bg-primary-3 dark:bg-white"
                  transition={
                    reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 42, mass: 0.8 }
                  }
                />
              )}
              <span className="relative">
                {label}
                {counts[value] && <span className="ml-1 font-medium tabular-nums opacity-70">{counts[value]}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}
