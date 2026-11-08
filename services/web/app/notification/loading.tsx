import { NotificationListSkeleton } from '@/components/common/Skeletons';

export default function Loading() {
  return (
    <section className="mx-auto w-full max-w-[840px]">
      <NotificationListSkeleton />
    </section>
  );
}
