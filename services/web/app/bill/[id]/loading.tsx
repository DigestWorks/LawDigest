import { SubHeader } from '@/components';
import { BillDetailSkeleton } from '@/components/common/Skeletons';

export default function Loading() {
  return (
    <section className="flex flex-col">
      <SubHeader title="의안 자세히 보기" />
      <section className="flex flex-col md:mb-10">
        <BillDetailSkeleton />
      </section>
    </section>
  );
}
