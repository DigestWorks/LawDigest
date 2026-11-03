import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { SubHeader } from '@/components';
import DataFreshnessNote from '@/components/common/DataFreshnessNote';
import getQueryClient from '@/lib/getQueryClient';
import { getPublicParty } from '@/lib/publicDetail';
import { getMetadata } from '@/utils';
import { Metadata } from 'next';
import { PARTY_POSITION, PARTY_NAME_KO } from '@/constants/party';
import PartyContainer from './components';

type PartyPageProps = {
  params: Promise<{ id: string }>;
};

export const generateMetadata = async ({ params }: PartyPageProps): Promise<Metadata> => {
  const { id } = await params;
  const { data } = await getPublicParty(id);

  return getMetadata({
    title: `${data.party_name}`,
    description: `${data.party_name} 상세 페이지, ${PARTY_POSITION[data.party_name as keyof typeof PARTY_NAME_KO]}, 지역구 ${data.district_congressman_count} 석, 비례대표 ${data.proportional_congressman_count} 석`,
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
