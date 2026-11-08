'use client';

import { BillListSkeleton, ReportListSkeleton } from '@/components/common/Skeletons';
import { SectionError } from '@/components/common/SectionState';

import { useSearchParams } from 'next/navigation';
import { useSearchParamsTransition } from '@/hooks/useSearchParamsTransition';
import { useIntersect } from '@/hooks';
import { feedAssembly, feedContent, feedStage, type FeedAssembly } from '@/lib/feedState';
import { Button } from '@/components/ui/button';
import { useListScrollRestoration } from '@/hooks/useListScrollRestoration';
import BillList from '@/components/Bill/BillList/BillList';
import { FEED_TAB } from '@/constants';
import { NotificationTopThree } from '@/app/notification/components';
import { useGetBillByStage, useGetBillPopular } from './apis';
import StageDropdown from '../StageDropdown';
import FeedFilterDropdown from '../FeedFilterDropdown';
import FeedTab from '../FeedTab';
import FollowingFeed from './FollowingFeed';
import ReportFeed from './ReportFeed';
import FollowingCongressmanStrip from './FollowingCongressmanStrip';

type ContentType = 'report' | 'bill' | 'following';

const ASSEMBLY_FILTERS: { label: string; value: FeedAssembly }[] = [
  { label: '제22대', value: '22' },
  { label: '제21대', value: '21' },
  { label: '전체 대수', value: 'all' },
];

const CONTENT_TABS: { label: string; value: ContentType; icon: React.ReactNode }[] = [
  {
    label: '리포트',
    value: 'report',
    icon: (
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M4 3.5C4 2.672 4.672 2 5.5 2H12L16 6V16.5C16 17.328 15.328 18 14.5 18H5.5C4.672 18 4 17.328 4 16.5V3.5Z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path d="M12 2V6H16" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M7 10H13M7 13H11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="15" cy="5" r="3" fill="currentColor" />
        <path
          d="M14 5L14.7 5.7L16.3 4"
          stroke="hsl(var(--background))"
          strokeWidth="1.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    label: '법안',
    value: 'bill',
    icon: (
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 5.5H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M4 9.5H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M4 13.5H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: '팔로잉',
    value: 'following',
    icon: (
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M4 17V3H16V17L10.5 14.2L10 13.95L9.5 14.2L4 17Z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

export default function Feed() {
  // params는 서버가 그린 현재 화면, navigation.params는 누른 값을 바로 반영한 다음 화면이다.
  // 목록 데이터는 현재 화면 기준으로 두고, 탭·정렬·필터 표시와 대기 중 스켈레톤은 다음 화면 기준으로 그린다.
  const params = useSearchParams();
  const navigation = useSearchParamsTransition();
  const contentType = feedContent(params.get('tab'));
  const assembly = feedAssembly(params.get('assembly'));
  const feedType =
    assembly === '22' && params.get('sort') === 'hot' ? FEED_TAB.sortedByPopularity : FEED_TAB.sortedByLatest;
  const stage = feedStage(params.get('stage'));
  const isLatest = feedType === FEED_TAB.sortedByLatest;
  const viewContent = feedContent(navigation.params.get('tab'));
  const viewAssembly = feedAssembly(navigation.params.get('assembly'));
  const viewFeedType =
    viewAssembly === '22' && navigation.params.get('sort') === 'hot'
      ? FEED_TAB.sortedByPopularity
      : FEED_TAB.sortedByLatest;
  const viewStage = feedStage(navigation.params.get('stage'));
  const viewLatest = viewFeedType === FEED_TAB.sortedByLatest;
  const query = useGetBillByStage(stage, assembly, contentType === 'bill' && isLatest);
  const popular = useGetBillPopular(contentType === 'bill' && !isLatest);
  const bills = isLatest ? query.data?.pages.flatMap(({ data }) => data.bill_list) ?? [] : popular.data?.data ?? [];
  const activeQuery = isLatest ? query : popular;
  useListScrollRestoration(params.toString(), contentType === 'bill' && Boolean(activeQuery.data));

  const update = (name: string, value: string) => {
    const next = new URLSearchParams(navigation.params.toString());
    if (value) next.set(name, value);
    else next.delete(name);
    if (name === 'assembly') next.delete('sort');
    navigation.push(next);
  };
  const fetchRef = useIntersect(() => {
    if (isLatest && query.hasNextPage && !query.isFetching && !query.isFetchNextPageError) {
      void query.fetchNextPage();
    }
  });

  let emptyMessage = isLatest ? '등록된 법안이 없습니다.' : '최근 7일 동안 조회하거나 스크랩한 법안이 없습니다.';
  if (isLatest && stage) emptyMessage = '이 단계에 해당하는 법안이 없습니다.';

  let results;
  if (navigation.pending || activeQuery.isPending) {
    results = <BillListSkeleton />;
  } else if (activeQuery.isError && !activeQuery.data) {
    results = (
      <div className="mx-5 mt-4">
        <SectionError
          message="법안을 불러오지 못했습니다."
          pending={activeQuery.isFetching}
          onRetry={() => void activeQuery.refetch()}
        />
      </div>
    );
  } else if (!bills.length) {
    results = (
      <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
        <p role="status" className="text-sm text-muted-foreground">
          {emptyMessage}
        </p>
        {isLatest && stage && (
          <Button variant="outline" onClick={() => update('stage', '')}>
            전체 단계 보기
          </Button>
        )}
      </div>
    );
  } else {
    results = (
      <BillList
        bills={bills}
        isFetching={isLatest && query.isFetchingNextPage}
        fetchRef={fetchRef}
        hasNextPage={isLatest && query.hasNextPage}
        error={isLatest && query.isFetchNextPageError}
        onLoadMore={() => void query.fetchNextPage()}
      />
    );
  }

  return (
    <section>
      <div className="mx-5 mt-5 mb-3">
        <h1 className="text-[26px] font-bold leading-tight text-black dark:text-white">피드</h1>
      </div>
      <div className="relative flex items-center gap-[5px] mx-6 mb-3" role="group" aria-label="피드 종류">
        <div
          className="feed-tab-indicator"
          aria-hidden="true"
          style={{
            transform: `translateX(${CONTENT_TABS.findIndex((tab) => tab.value === viewContent) * 90}px)`,
          }}
        />
        {CONTENT_TABS.map(({ label, value, icon }) => (
          <button
            key={value}
            type="button"
            aria-pressed={viewContent === value}
            onClick={() => update('tab', value)}
            className={`feed-content-tab${viewContent === value ? ' is-active' : ''}`}>
            {icon}
            <span>{label}</span>
          </button>
        ))}
      </div>
      {viewContent === 'report' &&
        (navigation.pending ? <ReportListSkeleton /> : <ReportFeed scrollKey={params.toString()} />)}
      {viewContent === 'following' &&
        (navigation.pending ? (
          <BillListSkeleton />
        ) : (
          <>
            <FollowingCongressmanStrip />
            <FollowingFeed scrollKey={params.toString()} />
          </>
        ))}
      {viewContent === 'bill' && (
        <>
          <NotificationTopThree />
          <section className="flex flex-wrap items-center justify-between gap-2 mx-5 mt-2">
            {viewAssembly === '22' ? (
              <FeedTab
                type={viewFeedType}
                clickHandler={(key) => update('sort', key === FEED_TAB.sortedByPopularity ? 'hot' : '')}
              />
            ) : (
              <span className="text-sm font-medium text-muted-foreground">최신순</span>
            )}
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <FeedFilterDropdown
                label="국회 대수"
                options={ASSEMBLY_FILTERS}
                value={viewAssembly}
                onChange={(value) => update('assembly', value === '22' ? '' : value)}
              />
              {viewLatest && (
                <StageDropdown
                  type={viewStage || '전체'}
                  clickHandler={(value) => update('stage', value === '전체' ? '' : value)}
                />
              )}
            </div>
          </section>
          {!viewLatest && (
            <p className="mx-5 mt-3 text-sm text-muted-foreground">제22대 · 최근 7일 조회수와 스크랩 수 합계</p>
          )}
          {results}
        </>
      )}
    </section>
  );
}
