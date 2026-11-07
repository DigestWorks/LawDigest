import { BillResponse } from '@/types';
import { BillDetail } from '../BillDetail';

export default function BillContainer({ data }: { data: BillResponse }) {
  return (
    <section className="flex flex-col md:mb-10">
      <BillDetail data={data} />
    </section>
  );
}
