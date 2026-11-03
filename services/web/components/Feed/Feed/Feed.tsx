'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useIntersect } from '@/hooks';
import { feedContent, feedStage } from '@/lib/feedState';
import { Button } from '@/components/ui/button';
import { useListScrollRestoration } from '@/hooks/useListScrollRestoration';
import BillList from '@/components/Bill/BillList/BillList';
import { FEED_TAB } from '@/constants';
import { NotificationTopThree } from '@/app/notification/components';
import { useGetBillByStage, useGetBillPopular } from './apis';
import StageDropdown from '../StageDropdown';
import FeedTab from '../FeedTab';
import FollowingFeed from './FollowingFeed';
import FollowingCongressmanStrip from './FollowingCongressmanStrip';

type ContentType = 'report' | 'bill' | 'following';

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
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const contentType = feedContent(params.get('tab'));
  const feedType = params.get('sort') === 'hot' ? FEED_TAB.sortedByPopularity : FEED_TAB.sortedByLatest;
  const stage = feedStage(params.get('stage'));
  const isLatest = feedType === FEED_TAB.sortedByLatest;
  const query = useGetBillByStage(stage, contentType !== 'following' && isLatest);
  const popular = useGetBillPopular(contentType !== 'following' && !isLatest);
  const bills = isLatest ? query.data?.pages.flatMap(({ data }) => data.bill_list) ?? [] : popular.data?.data ?? [];
  const activeQuery = isLatest ? query : popular;
  useListScrollRestoration(params.toString(), contentType !== 'following' && Boolean(activeQuery.data));

  const update = (name: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(name, value);
    else next.delete(name);
    router.push(`${pathname}${next.size ? `?${next}` : ''}`, { scroll: false });
  };
  const fetchRef = useIntersect(() => {
    if (isLatest && query.hasNextPage && !query.isFetching && !query.isFetchNextPageError) {
      void query.fetchNextPage();
    }
  });

  return (
    <section>
      <div className="mx-5 mt-5 mb-3">
        <h2 className="text-[26px] font-bold leading-tight text-black dark:text-white">피드</h2>
      </div>
      <div className="relative flex items-center gap-[5px] mx-6 mb-3" role="group" aria-label="피드 종류">
        <div
          className="feed-tab-indicator"
          aria-hidden="true"
          style={{
            transform: `translateX(${CONTENT_TABS.findIndex((tab) => tab.value === contentType) * 90}px)`,
          }}
        />
        {CONTENT_TABS.map(({ label, value, icon }) => (
          <button
            key={value}
            type="button"
            aria-pressed={contentType === value}
            onClick={() => update('tab', value)}
            className={`feed-content-tab${contentType === value ? ' is-active' : ''}`}>
            {icon}
            <span>{label}</span>
          </button>
        ))}
      </div>
      {contentType === 'following' ? (
        <>
          <FollowingCongressmanStrip />
          <FollowingFeed scrollKey={params.toString()} />
        </>
      ) : (
        <>
          <NotificationTopThree />
          <section className="flex items-center justify-between mx-5 mt-2">
            <FeedTab
              type={feedType}
              clickHandler={(key) => update('sort', key === FEED_TAB.sortedByPopularity ? 'hot' : '')}
            />
            {isLatest && (
              <StageDropdown
                type={stage || '전체'}
                clickHandler={(value) => update('stage', value === '전체' ? '' : value)}
              />
            )}
          </section>
          {activeQuery.isError && !activeQuery.data ? (
            <div className="flex flex-col items-center gap-3 py-8" role="alert">
              <p>법안을 불러오지 못했습니다.</p>
              <Button variant="outline" onClick={() => void activeQuery.refetch()}>
                다시 불러오기
              </Button>
            </div>
          ) : (
            <BillList
              bills={bills}
              isFetching={activeQuery.isPending || (isLatest && query.isFetchingNextPage)}
              fetchRef={fetchRef}
              hasNextPage={isLatest && query.hasNextPage}
              error={query.isFetchNextPageError}
              onLoadMore={() => void query.fetchNextPage()}
            />
          )}
          {activeQuery.isSuccess && bills.length === 0 && (
            <p className="py-10 text-center text-muted-foreground">조건에 맞는 법안이 없습니다.</p>
          )}
        </>
      )}
    </section>
  );
}
