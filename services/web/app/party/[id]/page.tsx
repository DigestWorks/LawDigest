import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { SubHeader } from '@/components';
import DataFreshnessNote from '@/components/common/DataFreshnessNote';
import getQueryClient from '@/lib/getQueryClient';
import { getPublicParty } from '@/lib/publicDetail';
import { getMetadata } from '@/utils';
import { Metadata } from 'next';
import PartyContainer from './components';

type PartyPageProps = {
  params: Promise<{ id: string }>;
};

export const generateMetadata = async ({ params }: PartyPageProps): Promise<Metadata> => {
  const { id } = await params;
  const { data } = await getPublicParty(id);

  return getMetadata({
    title: `${data.party_name}`,
    description: [
      `${data.party_name} 프로필`,
      data.parliamentary_rank ? `의석 기준 원내 ${data.parliamentary_rank}위` : null,
      `지역구 ${data.district_congressman_count}석, 비례대표 ${data.proportional_congressman_count}석`,
    ]
      .filter(Boolean)
      .join(' · '),
    asPath: `/party/${id}`,
  });
};

export default async function Party({ params }: PartyPageProps) {
  const { id } = await params;
  const queryClient = getQueryClient();
  queryClient.setQueryData(['/party/detail', Number(id)], await getPublicParty(id));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <section className="flex flex-col gap-10">
        <SubHeader title="정당 프로필" />
        <DataFreshnessNote className="mx-5" />
        <PartyContainer id={id} />
      </section>
    </HydrationBoundary>
  );
}
