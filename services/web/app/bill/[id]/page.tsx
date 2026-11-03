import { billHeadline } from '@/lib/billHeadline';
import { billResultLabel } from '@/lib/billStage';
import { Metadata } from 'next';
import { SubHeader } from '@/components';
import { getPublicBill } from '@/lib/publicDetail';
import { getMetadata } from '@/utils';
import { BillContainer } from './components';

type BillDetailPageProps = {
  params: Promise<{ id: string }>;
};

export const generateMetadata = async ({ params }: BillDetailPageProps): Promise<Metadata> => {
  const { id } = await params;
  const { data } = await getPublicBill(id);

  return getMetadata({
    title: billHeadline(
      data.bill_info_dto.bill_name,
      data.bill_info_dto.gpt_summary?.trim() ? data.bill_info_dto.title : null,
    ),
    description: `${data.bill_info_dto.propose_date} 발의, 처리 상태: ${billResultLabel(data.bill_info_dto.bill_result) || data.bill_info_dto.bill_stage}, '${data.bill_info_dto.bill_name}' 관련 발의안`,
    asPath: `/bill/${id}`,
  });
};

export default async function BillDetailPage({ params }: BillDetailPageProps) {
  const { id } = await params;
  const { data } = await getPublicBill(id);

  return (
    <section className="flex flex-col">
      <SubHeader title="의안 자세히 보기" />
      <BillContainer data={data} />
    </section>
  );
}
