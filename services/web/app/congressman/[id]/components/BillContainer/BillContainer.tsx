'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useListScrollRestoration } from '@/hooks/useListScrollRestoration';
import { BillList, BillTab } from '@/components/Bill';
import { useIntersect } from '@/hooks';
import { Button } from '@/components/ui/button';
import { useGetBillByCongressman } from '../../apis';

export default function BillContainer({ id }: { id: string }) {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const billType = params.get('proposal') === 'joint' ? 'public_proposer' : 'represent_proposer';
  const query = useGetBillByCongressman(id, billType);
  const bills = query.data?.pages.flatMap(({ data }) => data.bill_list) ?? [];
  useListScrollRestoration(`${pathname}?${params}`, Boolean(query.data));
  const fetchRef = useIntersect(() => {
    if (query.hasNextPage && !query.isFetching && !query.isFetchNextPageError) {
      void query.fetchNextPage();
    }
  });

  return (
    <section>
      <BillTab
        type={billType}
        clickHandler={(key) => {
          if (key !== 'represent_proposer' && key !== 'public_proposer') return;
          const next = new URLSearchParams(params.toString());
          if (key === 'public_proposer') next.set('proposal', 'joint');
          else next.delete('proposal');
          router.push(`${pathname}${next.size ? `?${next}` : ''}`, { scroll: false });
        }}
      />
      {query.isError && !query.data ? (
        <div className="flex flex-col items-center gap-3 py-8" role="alert">
          <p>발의 법안을 불러오지 못했습니다.</p>
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
      {query.isSuccess && bills.length === 0 && (
        <p className="py-8 text-sm text-center text-muted-foreground">
          {billType === 'represent_proposer' ? '대표발의한 법안이 없습니다.' : '공동발의한 법안이 없습니다.'}
        </p>
      )}
    </section>
  );
}
