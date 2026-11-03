import { dehydrate } from '@tanstack/react-query';
import { Suspense } from 'react';
import ContentSkeleton from '@/components/common/ContentSkeleton';
import ListHydrationBoundary from '@/lib/ListHydrationBoundary';
import getQueryClient from '@/lib/getQueryClient';
import { Feed, Layout } from '@/components';
import { feedQueryOptions } from '@/lib/billQueries';
import { feedContent, feedStage } from '@/lib/feedState';

export const dynamic = 'force-dynamic';

type HomeProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

async function HomeFeed({ params }: { params: Awaited<HomeProps['searchParams']> }) {
  const queryClient = getQueryClient();
  if (feedContent(typeof params.tab === 'string' ? params.tab : '') !== 'following' && params.sort !== 'hot') {
    const stage = feedStage(typeof params.stage === 'string' ? params.stage : '');
    await queryClient.prefetchInfiniteQuery(feedQueryOptions(stage));
  }
  return (
    <ListHydrationBoundary state={dehydrate(queryClient)}>
      <section className="lg:w-[880px] mx-auto">
        <Feed />
      </section>
    </ListHydrationBoundary>
  );
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  return (
    <Layout nav logo notification>
      <Suspense fallback={<ContentSkeleton />}>
        <HomeFeed params={params} />
      </Suspense>
    </Layout>
  );
}
