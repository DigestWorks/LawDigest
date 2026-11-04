import { cache } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { notFound } from 'next/navigation';
import { Layout } from '@/components';
import SafeBillSummaryHtml from '@/components/Bill/BillList/Bill/SafeBillSummaryHtml';
import { billHeadline } from '@/lib/billHeadline';
import { fetchPublicDetail, validPublicId } from '@/lib/publicDetail';
import { reportDateLabel, type ReportDetail } from '@/lib/reportQueries';
import { getMetadata } from '@/utils';

type ReportProps = { params: Promise<{ id: string }> };

const getReport = cache((id: string) => {
  if (!validPublicId(id)) notFound();
  return fetchPublicDetail<ReportDetail>(`/reports/${encodeURIComponent(id)}`);
});

export async function generateMetadata({ params }: ReportProps) {
  const { id } = await params;
  const { data } = await getReport(id);
  return getMetadata({
    title: billHeadline(data.report.bill_name, data.report.title),
    description: data.report.bill_name,
    asPath: `/report/${id}`,
  });
}

export default async function ReportPage({ params }: ReportProps) {
  const { id } = await params;
  const { data } = await getReport(id);
  const { report } = data;
  const officialName = billHeadline(report.bill_name);
  const headline = billHeadline(report.bill_name, report.title);
  return (
    <Layout nav logo notification>
      <article className="mx-auto flex w-full max-w-[880px] flex-col px-5 pb-10 pt-5 md:pt-8">
        <nav aria-label="리포트 탐색" className="mb-6">
          <Button asChild variant="ghost" size="sm">
            <Link href="/?tab=report">
              <ArrowLeft data-icon="inline-start" />
              리포트 목록
            </Link>
          </Button>
        </nav>
        <header className="flex flex-col gap-4 pb-6 md:gap-5 md:pb-8">
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <Badge variant="outline">법안 리포트</Badge>
            <span>{reportDateLabel(report.published_at)}</span>
          </div>
          <h1 className="break-words text-[26px] font-bold leading-snug md:text-[32px]">{headline}</h1>
          {!headline.endsWith(officialName) && (
            <p className="text-sm leading-6 text-muted-foreground md:text-base">{officialName}</p>
          )}
          <dl className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <div className="flex gap-2">
              <dt>국회</dt>
              <dd>제{report.assembly_number}대</dd>
            </div>
            <div className="flex gap-2">
              <dt>의안번호</dt>
              <dd>{report.bill_number}</dd>
            </div>
            <div className="flex gap-2">
              <dt>작성</dt>
              <dd>AI · 국회 자료 기반</dd>
            </div>
          </dl>
          <nav className="mt-1 flex flex-wrap gap-2" aria-label="법안 자료">
            <Button asChild variant="secondary" size="sm">
              <Link href={`/bill/${encodeURIComponent(id)}`}>법안 상세</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a
                href={`https://likms.assembly.go.kr/bill/billDetail.do?billId=${encodeURIComponent(id)}`}
                target="_blank"
                rel="noopener noreferrer">
                국회 원문 <ArrowUpRight data-icon="inline-end" aria-hidden="true" />
                <span className="sr-only">새 창</span>
              </a>
            </Button>
          </nav>
        </header>
        <Separator />
        <SafeBillSummaryHtml
          className="flex flex-col gap-4 break-words py-7 text-sm leading-7 md:py-8 md:text-base"
          markdown={data.markdown}
          style={{}}
        />
      </article>
    </Layout>
  );
}
