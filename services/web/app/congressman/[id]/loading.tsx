import { SubHeader } from '@/components';
import { ProfilePageSkeleton } from '@/components/common/Skeletons';

export default function Loading() {
  return (
    <section className="flex flex-col gap-10">
      <SubHeader title="의원 프로필" />
      <ProfilePageSkeleton kind="congressman" />
    </section>
  );
}
