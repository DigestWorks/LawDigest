import getMetadata from '@/utils/getMetadata';
import Link from 'next/link';
import { Layout } from '@/components';
import DataFreshnessNote from '@/components/common/DataFreshnessNote';
import { Button } from '@/components/ui/button';

export const metadata = getMetadata({
  title: '서비스 소개',
  description: '모두의입법이 제공하는 입법 정보와 자료의 출처, 수집 범위를 안내합니다.',
  asPath: '/about',
});

export default function AboutPage() {
  return (
    <Layout nav logo notification>
      <article className="mx-auto flex w-full max-w-[880px] flex-col gap-8 px-5 py-8">
        <header className="flex flex-col gap-3">
          <h1 className="text-[26px] font-semibold">모두의입법 소개</h1>
          <p className="max-w-prose text-base leading-7 text-muted-foreground">
            모두의입법에서 국회에 발의된 법안과 처리 경과를 살펴볼 수 있습니다. 법안을 검색하거나 분야별로 찾아보고,
            의원과 정당의 발의 활동을 확인할 수 있습니다.
          </p>
        </header>

        <section aria-labelledby="data-source" className="flex flex-col gap-3 border-y border-border py-6">
          <h2 id="data-source" className="text-xl font-semibold">
            자료 출처와 수집 기준
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            법안 정보는 국회 공개 자료를 바탕으로 제공합니다. 국회에서 새 자료를 공개한 뒤 모두의입법에 반영되기까지
            시간이 걸릴 수 있습니다.
          </p>
          <DataFreshnessNote />
          <DataFreshnessNote scope="timeline" showSource={false} />
        </section>

        <section aria-labelledby="summary-guide" className="flex flex-col gap-2">
          <h2 id="summary-guide" className="text-xl font-semibold">
            법안 요약과 원문
          </h2>
          <p className="max-w-prose text-sm leading-6 text-muted-foreground">
            법안 화면은 AI 요약과 국회가 공개한 제안이유·주요 내용을 구분해 표시합니다. 정확한 법안 문구와 처리 상태는
            각 법안의 국회 원문 링크에서 확인할 수 있습니다.
          </p>
        </section>

        <Button asChild variant="outline" className="self-start">
          <Link href="/?tab=bill">법안 둘러보기</Link>
        </Button>
      </article>
    </Layout>
  );
}
