'use client';
import { useRouter } from 'next/navigation';
import { getCookie } from 'cookies-next';
import { useIntersect } from '@/hooks';
import { ACCESS_TOKEN } from '@/constants';
import { loginHref } from '@/lib/loginNavigation';
import { useGetFollowingBill } from '@/app/following/apis';
import { BillList } from '@/components/Bill';
import { Button } from '@/components/ui/button';
import { useListScrollRestoration } from '@/hooks/useListScrollRestoration';

export default function FollowingFeed({ scrollKey }: { scrollKey: string }) {
  const router = useRouter();
  const accessToken = getCookie(ACCESS_TOKEN);
  const query = useGetFollowingBill(Boolean(accessToken));
  const bills = query.data?.pages.flatMap(({ data }) => data.bill_list) ?? [];
  useListScrollRestoration(scrollKey, Boolean(accessToken) && Boolean(query.data));
  const fetchRef = useIntersect(() => {
    if (query.hasNextPage && !query.isFetching && !query.isFetchNextPageError) void query.fetchNextPage();
  });
  if (!accessToken)
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p>팔로잉 피드를 보려면 로그인이 필요해요.</p>
        <Button onClick={() => router.push(loginHref(scrollKey ? `/?${scrollKey}` : '/?tab=following'))}>
          로그인하기
        </Button>
      </div>
    );
  return (
    <section className="mt-4">
      {query.isError && !query.data ? (
        <div className="flex flex-col items-center gap-3 py-8" role="alert">
          <p>팔로잉 법안을 불러오지 못했습니다.</p>
          <Button variant="outline" onClick={() => void query.refetch()}>
            다시 불러오기
          </Button>
        </div>
      ) : (
        <BillList
          bills={bills}
          isFetching={query.isPending || query.isFetchingNextPage}
          fetchRef={fetchRef}
          hasNextPage={query.hasNextPage}
          error={query.isFetchNextPageError}
          onLoadMore={() => void query.fetchNextPage()}
        />
      )}
      {query.isSuccess && !bills.length && (
        <p className="py-12 text-center text-muted-foreground">팔로잉한 의원의 법안이 없습니다.</p>
      )}
    </section>
  );
}
