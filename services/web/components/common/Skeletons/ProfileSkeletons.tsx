import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import LoadingRegion from './LoadingRegion';
import { BillCardsBlocks } from './BillSkeletons';

/** 팔로워·대표발의·공동발의 숫자 세 칸과 팔로우 버튼 (FollowBoard). */
function FollowBoardBlocks() {
  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex justify-between">
        {[0, 1, 2].map((key) => (
          <div key={key} className="flex basis-1/3 flex-col items-center gap-1.5">
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
      <Skeleton className="h-12 w-full rounded-full" />
    </div>
  );
}

function CongressmanProfileBlocks() {
  return (
    <div className="mx-5 mb-4 mt-5 flex shrink-0 flex-col gap-5 rounded-xl border-1.5 border-border px-6 py-5 md:mx-auto md:w-[430px] xl:mx-0 xl:w-[320px]">
      <div className="flex items-center gap-4">
        <Skeleton className="size-20 shrink-0 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-1 h-6 w-24 rounded-full" />
        </div>
      </div>
      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-4 w-36" />
      </div>
      <div className="h-px bg-gray-1 dark:bg-dark-l" />
      <FollowBoardBlocks />
      <div className="h-px bg-gray-1 dark:bg-dark-l" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-16" />
        {[0, 1, 2, 3, 4].map((key) => (
          <div key={key} className="flex justify-between gap-4">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-28" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** app/congressman/[id] 의원 카드 (CongressmanDetail). */
export function CongressmanProfileSkeleton() {
  return (
    <LoadingRegion label="의원 프로필을 불러오고 있습니다" className="w-auto">
      <CongressmanProfileBlocks />
    </LoadingRegion>
  );
}

function PartyProfileBlocks() {
  return (
    <div className="mx-5 mt-5 flex flex-col items-center gap-7 xl:mx-0 xl:w-[320px]">
      <div className="flex w-full flex-col items-center gap-5 pt-1">
        <Skeleton className="size-[130px] rounded-full" />
        <div className="flex flex-col items-center gap-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <div className="h-px w-full bg-border" />
      <FollowBoardBlocks />
    </div>
  );
}

/** app/party/[id] 정당 소개 (PartyDetail). */
export function PartyProfileSkeleton() {
  return (
    <LoadingRegion label="정당 프로필을 불러오고 있습니다">
      <PartyProfileBlocks />
    </LoadingRegion>
  );
}

/** 원형 아바타와 이름이 격자로 놓인 목록. 정당 소속 의원, 마이페이지 팔로우 의원에 쓴다. */
export function AvatarGridSkeleton({
  count = 8,
  label,
  className,
  avatarClassName = 'size-14',
}: {
  count?: number;
  label: string;
  className?: string;
  avatarClassName?: string;
}) {
  return (
    <LoadingRegion label={label}>
      <div className={cn('grid w-full grid-cols-4 justify-items-center gap-y-3', className)}>
        {Array.from({ length: count }, (_, index) => (
          <div key={index} className="flex flex-col items-center gap-2">
            <Skeleton className={cn('rounded-full', avatarClassName)} />
            <Skeleton className="h-4 w-12" />
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

/** app/party/[id] 소속 의원 격자 (PartyCongressmanList). */
function PartyMembersBlocks() {
  return (
    <div className="mx-5 my-10 grid grid-cols-4 justify-items-center gap-y-3 md:grid-cols-8 lg:grid-cols-4">
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="flex flex-col items-center gap-2">
          <Skeleton className="size-14 rounded-full" />
          <Skeleton className="h-4 w-12" />
        </div>
      ))}
    </div>
  );
}

export function PartyMembersSkeleton() {
  return (
    <LoadingRegion label="소속 의원을 불러오고 있습니다">
      <PartyMembersBlocks />
    </LoadingRegion>
  );
}

/** components/Bill/BillTab 밑줄 탭 자리. */
function BillTabBlocks() {
  return (
    <div className="flex h-10 w-full items-center gap-4 border-b border-divider lg:min-w-[840px]">
      <Skeleton className="mx-auto h-4 w-20" />
      <Skeleton className="mx-auto h-4 w-20" />
    </div>
  );
}

/** 의원·정당 라우트 전체: 프로필 카드와 발의 법안 목록. */
export function ProfilePageSkeleton({ kind }: { kind: 'congressman' | 'party' }) {
  return (
    <LoadingRegion
      label={kind === 'congressman' ? '의원 프로필을 불러오고 있습니다' : '정당 프로필을 불러오고 있습니다'}
      className={cn('xl:flex xl:justify-center xl:gap-10', kind === 'congressman' && 'xl:items-start')}>
      {kind === 'congressman' ? (
        <CongressmanProfileBlocks />
      ) : (
        <div>
          <PartyProfileBlocks />
          <PartyMembersBlocks />
        </div>
      )}
      <div className="min-w-0">
        <BillTabBlocks />
        <BillCardsBlocks count={2} />
      </div>
    </LoadingRegion>
  );
}

/** app/explore 국회 탭 의원 카드 (MemberList). */
export function MemberCardGridSkeleton({
  count = 6,
  label = '의원을 불러오고 있습니다',
}: {
  count?: number;
  label?: string;
}) {
  return (
    <LoadingRegion label={label}>
      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
        {Array.from({ length: count }, (_, index) => (
          <div
            key={index}
            className="flex items-center gap-3 rounded-2xl border border-gray-1 p-3.5 dark:border-dark-l">
            <Skeleton className="size-12 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-5 w-20" />
              <div className="flex gap-1.5">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-28" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

/** app/explore 정당 탭 정당 카드 (PartyList). */
export function PartyCardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <LoadingRegion label="원내 정당을 불러오고 있습니다">
      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
        {Array.from({ length: count }, (_, index) => (
          <div
            key={index}
            className="flex items-center gap-3 rounded-2xl border border-gray-1 p-3.5 dark:border-dark-l">
            <Skeleton className="size-11 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}
