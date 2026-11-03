import { cache } from 'react';
import Link from 'next/link';
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
      <article className="mx-auto w-full max-w-3xl space-y-6 px-5 py-8">
        <header className="space-y-3">
          <Link className="text-sm underline underline-offset-4" href="/?tab=report">
            리포트 목록
          </Link>
          <p className="text-sm text-muted-foreground">AI 법안 리포트 · {reportDateLabel(report.published_at)}</p>
          <h1 className="text-2xl font-bold sm:text-3xl">{headline}</h1>
          {!headline.endsWith(officialName) && <p className="text-muted-foreground">{officialName}</p>}
          <nav className="flex flex-wrap gap-x-4 gap-y-2 text-sm underline underline-offset-4" aria-label="법안 자료">
            <Link href={`/bill/${encodeURIComponent(id)}`}>법안 상세</Link>
            <a
              href={`https://likms.assembly.go.kr/bill/billDetail.do?billId=${encodeURIComponent(id)}`}
              target="_blank"
              rel="noopener noreferrer">
              국회 원문 <span className="sr-only">새 창</span>
            </a>
          </nav>
        </header>
        <SafeBillSummaryHtml
          className="space-y-3 break-words border-t pt-4 leading-7"
          markdown={data.markdown}
          style={{}}
        />
      </article>
    </Layout>
  );
}
