import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { SubHeader } from '@/components';
import DataFreshnessNote from '@/components/common/DataFreshnessNote';
import { getMetadata } from '@/utils';
import { Metadata } from 'next';
import getQueryClient from '@/lib/getQueryClient';
import { getPublicCongressman } from '@/lib/publicDetail';
import { CongressmanContainer } from './components';

type CongressmanPageProps = {
  params: Promise<{ id: string }>;
};

export const generateMetadata = async ({ params }: CongressmanPageProps): Promise<Metadata> => {
  const { id } = await params;
  const { data } = await getPublicCongressman(id);

  return getMetadata({
    title: `${data.congressman_name} 의원`,
    description: `${data.party_name} ${data.congressman_name} 의원의 상세 프로필 페이지, ${data.district} ${data.elected}, ${data.commits}`,
    asPath: `/congressman/${id}`,
  });
};

export default async function Congressman({ params }: CongressmanPageProps) {
  const { id } = await params;
  const queryClient = getQueryClient();
  queryClient.setQueryData(['/congressman/detail', id], await getPublicCongressman(id));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <section className="flex flex-col gap-10">
        <SubHeader title="의원 프로필" />
        <DataFreshnessNote className="mx-5" showRoster />
        <CongressmanContainer id={id} />
      </section>
    </HydrationBoundary>
  );
}
