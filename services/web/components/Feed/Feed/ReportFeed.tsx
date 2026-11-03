'use client';

import Link from 'next/link';
import { useInfiniteQuery } from '@tanstack/react-query';
import ContentSkeleton from '@/components/common/ContentSkeleton';
import { SectionEmpty, SectionError } from '@/components/common/SectionState';
import { Button } from '@/components/ui/button';
import { useListScrollRestoration } from '@/hooks/useListScrollRestoration';
import { billHeadline } from '@/lib/billHeadline';
import { reportDateLabel, reportQueryOptions } from '@/lib/reportQueries';

export default function ReportFeed({ scrollKey }: { scrollKey: string }) {
  const query = useInfiniteQuery(reportQueryOptions());
  const reports = query.data?.pages.flatMap(({ data }) => data.report_list) ?? [];
  useListScrollRestoration(scrollKey, Boolean(query.data));

  if (query.isPending) return <ContentSkeleton />;
  if (query.isError && !query.data) {
    return (
      <div className="mx-5 mt-4">
        <SectionError
          message="리포트를 불러오지 못했습니다."
          pending={query.isFetching}
          onRetry={() => void query.refetch()}
        />
      </div>
    );
  }
  if (!reports.length) {
    return (
      <div className="mx-5 space-y-4 py-5">
        <SectionEmpty>아직 공개된 리포트가 없습니다.</SectionEmpty>
        <Button asChild variant="outline">
          <Link href="/?tab=bill">법안 둘러보기</Link>
        </Button>
      </div>
    );
  }

  const uniqueReports = Array.from(new Map(reports.map((report) => [report.bill_id, report])).values());
  return (
    <section className="mx-5 space-y-4 py-5" aria-label="공개 법안 리포트">
      <p className="text-sm text-muted-foreground">AI가 국회 자료를 바탕으로 작성한 법안 리포트입니다.</p>
      <ul className="space-y-3">
        {uniqueReports.map((report) => {
          const officialName = billHeadline(report.bill_name);
          const headline = billHeadline(report.bill_name, report.title);
          return (
            <li key={report.bill_id}>
              <Link
                href={`/report/${encodeURIComponent(report.bill_id)}`}
                className="block space-y-2 rounded-lg border bg-background p-4 hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
                <p className="text-sm text-muted-foreground">{reportDateLabel(report.published_at)}</p>
                <h2 className="text-lg font-semibold">{headline}</h2>
                {!headline.endsWith(officialName) && <p className="text-sm text-muted-foreground">{officialName}</p>}
              </Link>
            </li>
          );
        })}
      </ul>
      {query.hasNextPage && (
        <div className="flex flex-col items-center gap-2 pt-2">
          {query.isFetchNextPageError && <p role="alert">다음 리포트를 불러오지 못했습니다.</p>}
          <Button variant="outline" onClick={() => void query.fetchNextPage()} disabled={query.isFetchingNextPage}>
            {query.isFetchNextPageError ? '다시 불러오기' : '리포트 더 보기'}
          </Button>
        </div>
      )}
    </section>
  );
}
