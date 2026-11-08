'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ReportListSkeleton, useSkeletonGate } from '@/components/common/Skeletons';
import { SectionEmpty, SectionError } from '@/components/common/SectionState';
import { Button, buttonVariants } from '@/components/ui/button';
import { useListScrollRestoration } from '@/hooks/useListScrollRestoration';
import { billHeadline } from '@/lib/billHeadline';
import { reportDateLabel, reportQueryOptions } from '@/lib/reportQueries';

export default function ReportFeed({ scrollKey }: { scrollKey: string }) {
  const query = useInfiniteQuery(reportQueryOptions());
  const reports = query.data?.pages.flatMap(({ data }) => data.report_list) ?? [];
  useListScrollRestoration(scrollKey, Boolean(query.data));
  const showSkeleton = useSkeletonGate(query.isPending);

  if (showSkeleton) return <ReportListSkeleton />;
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
    <section className="pt-4" aria-label="공개 법안 리포트">
      <p className="px-5 pb-4 text-xs leading-5 text-muted-foreground">
        국회 자료를 바탕으로 AI가 작성한 리포트입니다.
      </p>
      <ul className="flex flex-col">
        {uniqueReports.map((report) => {
          const officialName = billHeadline(report.bill_name);
          const headline = billHeadline(report.bill_name, report.title);
          return (
            <li key={report.bill_id}>
              <Link
                href={`/report/${encodeURIComponent(report.bill_id)}`}
                className="group flex flex-col gap-4 border-b border-border px-5 py-6 transition-colors hover:bg-muted/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring md:gap-5 md:py-7">
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <Badge variant="outline">법안 리포트</Badge>
                  <span>{reportDateLabel(report.published_at)}</span>
                </div>
                <h2 className="break-words text-xl font-semibold leading-snug md:text-[22px]">{headline}</h2>
                {!headline.endsWith(officialName) && (
                  <p className="text-sm leading-6 text-muted-foreground">{officialName}</p>
                )}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">
                    제{report.assembly_number}대 · 의안번호 {report.bill_number}
                  </span>
                  <span className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
                    리포트 읽기 <ArrowUpRight data-icon="inline-end" aria-hidden="true" />
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
      {query.hasNextPage && (
        <div className="flex flex-col items-center gap-2 py-6">
          {query.isFetchNextPageError && <p role="alert">다음 리포트를 불러오지 못했습니다.</p>}
          <Button variant="outline" onClick={() => void query.fetchNextPage()} disabled={query.isFetchingNextPage}>
            {query.isFetchNextPageError ? '다시 불러오기' : '리포트 더 보기'}
          </Button>
        </div>
      )}
    </section>
  );
}
