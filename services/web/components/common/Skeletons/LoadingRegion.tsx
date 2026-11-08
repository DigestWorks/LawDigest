import { cn } from '@/lib/utils';

/** 스켈레톤 묶음을 화면 읽기 프로그램에 한 번만 알린다. 블록은 모두 aria-hidden이다. */
export default function LoadingRegion({
  label,
  className,
  children,
  as: Tag = 'div',
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
  as?: 'div' | 'section' | 'li';
}) {
  return (
    <Tag role="status" aria-busy="true" className={cn('w-full', className)}>
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="contents">
        {children}
      </div>
    </Tag>
  );
}
