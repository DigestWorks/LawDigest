'use client';

export type AssemblySegmentValue = 'member' | 'party';

const SEGMENTS: { key: AssemblySegmentValue; label: string }[] = [
  { key: 'member', label: '의원' },
  { key: 'party', label: '정당' },
];

interface AssemblySegmentProps {
  active: AssemblySegmentValue;
  onChange: (value: AssemblySegmentValue) => void;
}

/** 국회 패널 상단 의원/정당 세그먼트 컨트롤. 선택 표시가 탭 사이를 이동한다. */
export default function AssemblySegment({ active, onChange }: AssemblySegmentProps) {
  const activeIndex = Math.max(
    SEGMENTS.findIndex(({ key }) => key === active),
    0,
  );

  return (
    <div
      role="tablist"
      aria-label="국회 하위 세그먼트"
      className="relative inline-grid grid-cols-2 self-start rounded-full bg-gray-0.5 p-1 text-[13px] font-semibold dark:bg-dark-l">
      <span
        aria-hidden="true"
        className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-primary-3 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none dark:bg-gray-0.5"
        style={{ transform: `translateX(${activeIndex * 100}%)` }}
      />
      {SEGMENTS.map(({ key, label }) => {
        const isActive = key === active;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(key)}
            className={[
              'relative rounded-full px-5 py-1.5 transition-colors duration-300',
              isActive ? 'text-white dark:text-black' : 'text-gray-2 hover:text-gray-3 dark:hover:text-gray-1',
            ].join(' ')}>
            {label}
          </button>
        );
      })}
    </div>
  );
}
