import { SubHeader } from '@/components';
import { ProfilePageSkeleton } from '@/components/common/Skeletons';

export default function Loading() {
  return (
    <section className="flex flex-col gap-10">
      <SubHeader title="정당 프로필" />
      <ProfilePageSkeleton kind="party" />
    </section>
  );
}
