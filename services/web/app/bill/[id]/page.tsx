import { Metadata } from 'next';
import { SubHeader } from '@/components';
import { getPublicBill } from '@/lib/publicDetail';
import { getMetadata } from '@/utils';
import { BillDetail } from './components';
import { usePatchViewCount } from './apis';

type BillDetailPageProps = {
  params: Promise<{ id: string }>;
};

export const generateMetadata = async ({ params }: BillDetailPageProps): Promise<Metadata> => {
  const { id } = await params;
  const { data } = await getPublicBill(id);

  return getMetadata({
    title: data.bill_info_dto.title,
    description: `${data.bill_info_dto.propose_date} 발의, 처리 상태: ${data.bill_info_dto.bill_result || data.bill_info_dto.bill_stage}, '${data.bill_info_dto.bill_name}' 관련 발의안`,
    asPath: `/bill/${id}`,
  });
};

export default async function BillDetailPage({ params }: BillDetailPageProps) {
  const { id } = await params;
  const { data } = await getPublicBill(id);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const viewCount = await usePatchViewCount(id)
    .then((res) => res.data.view_count)
    .catch(() => data.bill_info_dto.view_count);

  return (
    <section className="flex flex-col">
      <SubHeader title="의안 자세히 보기" />
      <section className="flex flex-col md:mb-10">
        <BillDetail data={data} viewCount={viewCount} />
      </section>
    </section>
  );
}
