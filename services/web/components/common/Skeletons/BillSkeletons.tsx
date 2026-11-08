import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import LoadingRegion from './LoadingRegion';

// 서버 렌더와 하이드레이션 결과가 같도록 너비는 고정 배열에서 고른다.
const LINE_WIDTHS = ['w-full', 'w-11/12', 'w-4/5', 'w-2/3', 'w-5/6'];
const TITLE_WIDTHS = ['w-4/5', 'w-3/5', 'w-11/12'];

/** 문단 줄 자리. 다른 스켈레톤 안에서 쓰는 블록이므로 상태 안내를 따로 갖지 않는다. */
export function LineSkeleton({
  lines = 3,
  className,
  lineClassName = 'h-4',
}: {
  lines?: number;
  className?: string;
  lineClassName?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-2.5', className)}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton key={index} className={cn(lineClassName, LINE_WIDTHS[index % LINE_WIDTHS.length])} />
      ))}
    </div>
  );
}

/** 상태 안내가 붙은 문단 줄 자리. 제안이유·발의자 명단처럼 펼쳐서 불러오는 곳에 쓴다. */
export function InlineLinesSkeleton({
  label,
  lines = 3,
  className,
}: {
  label: string;
  lines?: number;
  className?: string;
}) {
  return (
    <LoadingRegion label={label} className={className}>
      <LineSkeleton lines={lines} />
    </LoadingRegion>
  );
}

/** components/Bill/BillList/Bill/Bill.tsx 목록 카드와 같은 배치의 블록. */
function BillCardBlocks({ index }: { index: number }) {
  return (
    <div className="flex flex-col md:mx-5">
      <div className="flex flex-col gap-5 px-5 pt-6 md:flex-row md:justify-between md:gap-10">
        <div className="flex flex-col gap-2 md:w-[270px] md:shrink-0">
          <Skeleton className={cn('h-7', TITLE_WIDTHS[index % TITLE_WIDTHS.length])} />
          <Skeleton className="h-7 w-2/5 md:w-3/5" />
          <div className="mt-1 flex items-center gap-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-6 w-16 rounded-sm" />
          </div>
        </div>
        <div className="flex flex-col gap-5 md:w-[440px] lg:w-[490px]">
          <LineSkeleton lines={3} />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="size-9 rounded-full" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-14" />
            </div>
            <Skeleton className="h-10 w-[88px] rounded-full" />
          </div>
        </div>
      </div>
      <div className="pb-6 pt-4">
        <div className="mx-5 flex h-[78px] items-center gap-3 rounded-lg border-1.5 border-border px-[18px] md:ml-auto md:w-[410px] lg:mr-6 lg:w-[460px]">
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-6 w-16" />
        </div>
      </div>
      <div className="h-[10px] bg-gray-0.5 dark:bg-gray-4 md:h-px" />
    </div>
  );
}

/** 다른 스켈레톤 안에 넣는 법안 카드 블록 묶음. */
export function BillCardsBlocks({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <BillCardBlocks key={index} index={index} />
      ))}
    </>
  );
}

/** 법안 목록 첫 로딩과 무한 스크롤 다음 페이지 자리. */
export function BillListSkeleton({
  count = 3,
  label = '법안을 불러오고 있습니다',
  instant = false,
}: {
  count?: number;
  label?: string;
  instant?: boolean;
}) {
  return (
    <LoadingRegion label={label} instant={instant}>
      <BillCardsBlocks count={count} />
    </LoadingRegion>
  );
}

/** components/Feed/Feed/Feed.tsx의 제목·피드 종류·정렬 줄과 법안 카드. 홈 첫 렌더에 쓴다. */
export function FeedSkeleton() {
  return (
    <LoadingRegion label="피드를 불러오고 있습니다" className="lg:mx-auto lg:w-[880px]">
      <div className="mx-5 mb-3 mt-5">
        <Skeleton className="h-8 w-16" />
      </div>
      <div className="mx-6 mb-3 flex gap-[5px]">
        {[0, 1, 2].map((key) => (
          <Skeleton key={key} className="h-9 w-[85px] rounded-full" />
        ))}
      </div>
      <div className="mx-5 mt-2 flex items-center justify-between">
        <Skeleton className="h-9 w-36 rounded-full" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-full" />
          <Skeleton className="h-9 w-20 rounded-full" />
        </div>
      </div>
      <BillCardsBlocks />
    </LoadingRegion>
  );
}

/** components/Feed/Feed/ReportFeed.tsx 리포트 목록 항목. */
export function ReportListSkeleton({ count = 3, instant = false }: { count?: number; instant?: boolean }) {
  return (
    <LoadingRegion label="리포트를 불러오고 있습니다" className="pt-4" instant={instant}>
      <Skeleton className="mx-5 mb-4 h-3 w-56" />
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="flex flex-col gap-4 border-b border-border px-5 py-6 md:gap-5 md:py-7">
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className={cn('h-7', TITLE_WIDTHS[index % TITLE_WIDTHS.length])} />
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-8 w-24 rounded-full" />
          </div>
        </div>
      ))}
    </LoadingRegion>
  );
}

/** app/report/[id]/page.tsx 리포트 본문. */
export function ReportDetailSkeleton() {
  return (
    <LoadingRegion label="리포트를 불러오고 있습니다" className="mx-auto max-w-[880px] px-5 pb-10 pt-5 md:pt-8">
      <Skeleton className="mb-6 h-8 w-28 rounded-full" />
      <div className="flex flex-col gap-4 pb-6 md:gap-5 md:pb-8">
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-9 w-11/12 md:h-10" />
        <Skeleton className="h-9 w-3/5 md:h-10" />
        <div className="flex gap-5">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-28" />
        </div>
        <div className="mt-1 flex gap-2">
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
      </div>
      <div className="h-px bg-border" />
      <div className="flex flex-col gap-8 py-7 md:py-8">
        <LineSkeleton lines={5} />
        <LineSkeleton lines={4} />
        <LineSkeleton lines={5} />
      </div>
    </LoadingRegion>
  );
}

/** app/bill/[id] 상세: 왼쪽 법안 카드, 오른쪽 발의자·진행 단계·처리 결과, 아래 다른 개정안. */
export function BillDetailSkeleton() {
  return (
    <LoadingRegion label="법안 상세를 불러오고 있습니다" className="flex flex-col">
      <div className="flex flex-col items-start md:flex-row md:items-stretch">
        <div className="flex w-full flex-col gap-5 px-5 pt-6 md:flex-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-11/12" />
          <Skeleton className="h-9 w-2/3" />
          <div className="flex gap-4">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-4 w-36" />
          <LineSkeleton lines={5} />
          <LineSkeleton lines={4} />
          <div className="mt-5 flex items-center gap-4">
            <Skeleton className="size-9 rounded-full" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-14" />
          </div>
        </div>
        <div className="flex w-full flex-col md:w-[300px] md:border-l md:border-border lg:w-[490px]">
          <div className="pb-6 pt-4">
            <div className="mx-5 flex h-[78px] items-center gap-3 rounded-lg border-1.5 border-border px-[18px]">
              <Skeleton className="size-10 shrink-0 rounded-full" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </div>
          <div className="mx-5 mt-[34px] flex flex-col gap-[34px]">
            {[0, 1, 2].map((key) => (
              <div key={key} className="flex flex-col gap-4">
                <Skeleton className="h-6 w-28" />
                <Skeleton className="h-20 w-full rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-4 px-5 pt-[34px] md:w-[calc(100%-340px)] lg:w-[calc(100%-530px)]">
        <Skeleton className="h-7 w-3/5" />
        {[0, 1, 2].map((key) => (
          <Skeleton key={key} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    </LoadingRegion>
  );
}
