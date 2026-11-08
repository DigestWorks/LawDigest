import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import LoadingRegion from './LoadingRegion';
import { BillCardsBlocks } from './BillSkeletons';

const CHIP_WIDTHS = ['w-20', 'w-24', 'w-16', 'w-28', 'w-20', 'w-24', 'w-16', 'w-20'];

/* ───────── 타임라인 ───────── */

/** app/timeline/components/TimelineBoard 요약 카드. */
function TimelineBoardBlocks() {
  return (
    <div className="mx-auto flex w-full flex-col items-center gap-3 border-b border-border py-4 md:mb-6 md:mt-10 md:w-[760px] md:flex-row md:justify-center md:gap-[50px] md:rounded-xl md:border-none md:pt-6">
      <div className="flex flex-col items-center gap-3 md:flex-row md:gap-6">
        <Skeleton className="h-8 w-28 md:h-14 md:w-48" />
        <Skeleton className="h-5 w-32 md:h-12 md:w-24" />
      </div>
      <div className="grid w-full grid-cols-3 gap-2 md:w-auto md:gap-6">
        {[0, 1, 2].map((key) => (
          <div key={key} className="flex flex-col items-center gap-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** app/timeline/components/ListContainer 날짜별 기록. */
function TimelineEntriesBlocks() {
  return (
    <div className="flex flex-col">
      {[0, 1].map((key) => (
        <div key={key} className="flex gap-6">
          <div className="w-[2px] shrink-0 bg-border" />
          <div className="relative w-full min-w-0 pb-10">
            <Skeleton className="absolute -left-[38px] top-5 size-[25px] rounded-full" />
            <Skeleton className="mb-4 mt-3 h-11 w-40" />
            <div className="flex flex-col gap-5">
              <Skeleton className="h-28 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function TimelineEntriesSkeleton() {
  return (
    <LoadingRegion label="날짜별 입법 기록을 불러오고 있습니다">
      <TimelineEntriesBlocks />
    </LoadingRegion>
  );
}

export function TimelineSkeleton() {
  return (
    <LoadingRegion label="타임라인을 불러오고 있습니다">
      <TimelineBoardBlocks />
      <div className="mx-auto my-6 px-5 md:w-[640px] lg:w-[840px] xl:w-[1200px]">
        <div className="mb-6 flex gap-1 overflow-hidden pb-2">
          {[0, 1, 2, 3, 4].map((key) => (
            <Skeleton key={key} className={cn('h-8 shrink-0 rounded-full', CHIP_WIDTHS[key])} />
          ))}
        </div>
        <TimelineEntriesBlocks />
      </div>
    </LoadingRegion>
  );
}

/* ───────── 탐색 ───────── */

function SectionTitleBlocks({ icon = true }: { icon?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      {icon && <Skeleton className="size-5 rounded-full" />}
      <Skeleton className="h-5 w-32" />
    </div>
  );
}

function KeywordChipsBlocks() {
  return (
    <div className="flex flex-col gap-3">
      <SectionTitleBlocks />
      <div className="-mx-4 flex gap-2 overflow-hidden px-4 md:mx-0 md:flex-wrap md:px-0">
        {CHIP_WIDTHS.map((width, index) => (
          <Skeleton key={index} className={cn('h-9 shrink-0 rounded-full', width)} />
        ))}
      </div>
    </div>
  );
}

/** app/explore/components/TrendingKeywords. */
export function KeywordChipsSkeleton() {
  return (
    <LoadingRegion label="인기 키워드를 불러오고 있습니다">
      <KeywordChipsBlocks />
    </LoadingRegion>
  );
}

function CategoryGridBlocks() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="flex flex-col items-start gap-2 rounded-2xl border p-4">
          <Skeleton className="size-[26px] rounded-full" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}

/** app/explore/components/CategoryGrid. */
export function CategoryGridSkeleton() {
  return (
    <LoadingRegion label="분야를 불러오고 있습니다">
      <CategoryGridBlocks />
    </LoadingRegion>
  );
}

/** app/explore/components/SeatDistribution: 반원 좌석 차트. */
export function SeatDistributionSkeleton() {
  return (
    <LoadingRegion
      label="의석 분포를 불러오고 있습니다"
      className="rounded-2xl border border-gray-1 p-4 dark:border-dark-l">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="flex justify-center">
        <Skeleton className="aspect-[100/56] w-full max-w-[420px] rounded-t-full rounded-b-none" />
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1.5">
        {CHIP_WIDTHS.map((width, index) => (
          <Skeleton key={index} className={cn('h-[18px]', width)} />
        ))}
      </div>
    </LoadingRegion>
  );
}

/** app/explore/components/MemberRanking: 상위 3명 카드. */
export function MemberRankingSkeleton() {
  return (
    <LoadingRegion label="의원 발의 순위를 불러오고 있습니다" className="flex flex-col gap-3">
      <SectionTitleBlocks />
      <div className="-mx-4 flex gap-3 overflow-hidden px-4 md:mx-0 md:grid md:grid-cols-3 md:px-0">
        {[0, 1, 2].map((key) => (
          <div
            key={key}
            className="flex w-[128px] shrink-0 flex-col items-center gap-2 rounded-2xl border border-gray-1 p-3 dark:border-dark-l md:w-auto">
            <Skeleton className="size-14 rounded-full" />
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

/** 탐색 라우트: 데스크톱 사이드바, 모바일 서브탭, 분야 패널. */
export function ExploreSkeleton() {
  return (
    <LoadingRegion label="탐색 화면을 불러오고 있습니다" className="lg:flex lg:gap-8 lg:px-6 lg:pt-6">
      <div className="hidden shrink-0 flex-col gap-2 lg:flex lg:w-[200px]">
        <Skeleton className="mx-3 mb-1 h-3 w-10" />
        {[0, 1, 2].map((key) => (
          <Skeleton key={key} className="h-11 w-full rounded-xl" />
        ))}
      </div>
      <div className="min-w-0 lg:flex-1">
        <div className="flex h-11 items-center justify-around border-b border-divider px-2 lg:hidden">
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-5 w-12" />
          ))}
        </div>
        <div className="flex flex-col gap-7 px-4 pb-28 pt-4 md:px-6 md:pb-16 lg:px-0 lg:pt-0">
          <KeywordChipsBlocks />
          <div className="flex flex-col gap-3">
            <SectionTitleBlocks icon={false} />
            <CategoryGridBlocks />
          </div>
        </div>
      </div>
    </LoadingRegion>
  );
}

/** app/explore/category/[code]: 돌아가기 버튼, 분야 제목, 법안 목록. */
export function CategoryPageSkeleton() {
  return (
    <LoadingRegion label="분야 법안을 불러오고 있습니다" className="mx-auto min-w-0 max-w-[900px] space-y-4 px-5 py-6">
      <Skeleton className="h-10 w-24 rounded-full" />
      <div className="flex items-center gap-2">
        <Skeleton className="size-6 rounded-full" />
        <Skeleton className="h-8 w-40" />
      </div>
      <div className="-mx-5">
        <BillCardsBlocks />
      </div>
    </LoadingRegion>
  );
}

/* ───────── 검색 ───────── */

/** app/search/[id]: 검색창, 결과 제목, 유형 버튼, 의원·정당 줄, 법안 카드. */
export function SearchSkeleton() {
  return (
    <LoadingRegion label="검색 결과를 불러오고 있습니다">
      <div className="mx-auto my-5 w-full max-w-[600px] px-5">
        <Skeleton className="h-10 w-full rounded-full" />
      </div>
      <div className="mx-auto lg:w-[840px]">
        <Skeleton className="mx-5 my-5 h-7 w-48" />
        <div className="mx-5 mb-5 flex gap-2">
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} className={cn('h-8 rounded-full', CHIP_WIDTHS[key])} />
          ))}
        </div>
        <div className="mx-5 mb-6 flex flex-col gap-3">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
        <BillCardsBlocks count={2} />
      </div>
    </LoadingRegion>
  );
}

/** 검색 결과의 의원·정당 줄. */
export function PeopleRowsSkeleton() {
  return (
    <LoadingRegion label="의원·정당을 검색하고 있습니다" className="mx-5 mb-6 flex w-auto flex-col gap-3">
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-14 w-full" />
    </LoadingRegion>
  );
}

/* ───────── 알림 ───────── */

function NotificationRowBlocks({ index }: { index: number }) {
  return (
    <div className="flex items-center gap-[10px] lg:gap-4">
      <Skeleton className="ml-6 size-[50px] shrink-0 rounded-full" />
      <div className="flex flex-1 flex-col gap-1.5">
        <Skeleton className={cn('h-4', index % 2 ? 'w-2/3' : 'w-4/5')} />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

/** app/notification 전체 알림 목록. */
export function NotificationListSkeleton() {
  return (
    <LoadingRegion label="알림을 불러오고 있습니다" className="mb-10 mt-6 flex flex-col px-5">
      <div className="mb-[18px] ml-3 flex items-center justify-between">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="size-8 rounded-full" />
      </div>
      <div className="flex flex-col gap-5">
        {[0, 1, 2, 3, 4].map((index) => (
          <NotificationRowBlocks key={index} index={index} />
        ))}
      </div>
    </LoadingRegion>
  );
}

/** 피드 위 최근 알림 카드 (NotificationTopThree). */
export function NotificationPreviewSkeleton() {
  return (
    <LoadingRegion
      label="최근 알림을 불러오고 있습니다"
      className="mx-4 mb-10 mt-6 flex w-auto flex-col gap-4 rounded-xl border border-gray-1 p-5 dark:border-dark-l md:mx-6">
      <Skeleton className="h-7 w-24" />
      <div className="h-px bg-border" />
      <div className="flex flex-col gap-3 md:gap-4">
        {[0, 1, 2].map((index) => (
          <NotificationRowBlocks key={index} index={index} />
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-20 rounded-full" />
      </div>
    </LoadingRegion>
  );
}

/* ───────── 마이페이지 ───────── */

function UserInfoBlocks() {
  return (
    <div className="flex h-[200px] items-center gap-4 px-[30px] md:mt-10 md:h-[300px] md:w-[708px] md:rounded-xl md:border md:border-border lg:h-[260px] lg:w-[200px] lg:flex-col lg:justify-center lg:gap-5">
      <Skeleton className="size-[100px] shrink-0 rounded-full" />
      <div className="flex w-full flex-col gap-3 lg:items-center">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-3 w-36" />
      </div>
    </div>
  );
}

/** app/mypage 회원 정보 카드 (UserInfo). */
export function UserInfoSkeleton() {
  return (
    <LoadingRegion label="회원 정보를 불러오고 있습니다" className="w-auto">
      <UserInfoBlocks />
    </LoadingRegion>
  );
}

function FollowedPartiesBlocks() {
  return (
    <div className="grid grid-cols-2 gap-y-5 md:grid-cols-4 lg:w-[750px] lg:grid-cols-5 xl:w-[900px] xl:grid-cols-6">
      {[0, 1, 2, 3].map((key) => (
        <Skeleton key={key} className="mr-[10px] h-[102px] w-[140px] rounded-lg" />
      ))}
    </div>
  );
}

/** 마이페이지 팔로우한 정당 (PartyItem 140×102 카드). */
export function FollowedPartiesSkeleton() {
  return (
    <LoadingRegion label="팔로우한 정당을 불러오고 있습니다">
      <FollowedPartiesBlocks />
    </LoadingRegion>
  );
}

function FollowedMembersBlocks() {
  return (
    <div className="grid grid-cols-4 gap-y-4 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12">
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="flex flex-col items-center gap-1.5">
          <Skeleton className="size-10 rounded-full" />
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-4 w-12" />
        </div>
      ))}
    </div>
  );
}

/** 마이페이지 팔로우한 의원 (ExpandableList 격자). */
export function FollowedMembersSkeleton() {
  return (
    <LoadingRegion label="팔로우한 의원을 불러오고 있습니다">
      <FollowedMembersBlocks />
    </LoadingRegion>
  );
}

function BookmarkedBillsBlocks({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('mx-[30px] flex flex-col gap-4 lg:mx-0', className)}>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="flex flex-col gap-3 rounded-xl border-1.5 border-border p-4 md:py-5">
          <Skeleton className={cn('h-5', index % 2 ? 'w-3/5' : 'w-4/5')} />
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-16 rounded-sm" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** 마이페이지 스크랩한 법안 (BillBookmarked 카드). */
export function BookmarkedBillsSkeleton({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <LoadingRegion label="스크랩한 법안을 불러오고 있습니다">
      <BookmarkedBillsBlocks count={count} className={className} />
    </LoadingRegion>
  );
}

function SectionHeadingBlocks() {
  return <Skeleton className="h-7 w-36" />;
}

/** app/mypage 전체. 세션 확인과 라우트 이동에 쓴다. */
export function MyPageSkeleton() {
  return (
    <LoadingRegion
      label="마이페이지를 불러오고 있습니다"
      className="flex h-full flex-col gap-8 md:items-center lg:mx-auto lg:ml-10 lg:mt-10 lg:flex-row lg:items-start lg:justify-center xl:ml-0">
      <UserInfoBlocks />
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-6 px-[30px]">
          <SectionHeadingBlocks />
          <FollowedPartiesBlocks />
        </div>
        <div className="flex flex-col gap-6 px-[30px]">
          <SectionHeadingBlocks />
          <FollowedMembersBlocks />
        </div>
        <div className="flex flex-col gap-6 lg:px-[30px]">
          <div className="px-[30px] lg:px-0">
            <SectionHeadingBlocks />
          </div>
          <BookmarkedBillsBlocks count={2} />
        </div>
      </div>
    </LoadingRegion>
  );
}

/* ───────── 팔로잉 ───────── */

function FollowingAvatarsBlocks() {
  return (
    <div className="flex w-full gap-3 overflow-hidden lg:flex-col lg:gap-2 xl:gap-4">
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="flex shrink-0 flex-col items-center gap-1.5 xl:flex-row xl:gap-3">
          <Skeleton className="size-12 rounded-full" />
          <Skeleton className="h-4 w-12" />
        </div>
      ))}
    </div>
  );
}

/** app/following 팔로우한 의원 줄 (FollowingNav의 CongressmanList). */
export function FollowingAvatarsSkeleton() {
  return (
    <LoadingRegion label="팔로우한 의원을 불러오고 있습니다">
      <FollowingAvatarsBlocks />
    </LoadingRegion>
  );
}

/** app/following 전체. 세션 확인과 라우트 이동에 쓴다. */
export function FollowingSkeleton() {
  return (
    <LoadingRegion label="팔로잉을 불러오고 있습니다" className="mx-auto flex flex-col lg:flex-row lg:justify-center">
      <div className="mx-auto w-full border-b border-border py-4 pl-5 md:mb-6 md:mt-10 md:w-[708px] md:rounded-xl md:border lg:mx-0 lg:my-0 lg:w-[120px] lg:rounded-none lg:border-none lg:pt-8 xl:w-[312px]">
        <Skeleton className="mb-4 h-8 w-20 lg:hidden" />
        <FollowingAvatarsBlocks />
      </div>
      <div className="mt-4 min-w-0 md:mt-0 lg:border-l-1 lg:border-border">
        <BillCardsBlocks count={2} />
      </div>
    </LoadingRegion>
  );
}
