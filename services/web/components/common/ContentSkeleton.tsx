import { Skeleton } from '@/components/ui/skeleton';

export default function ContentSkeleton() {
  return (
    <section
      role="status"
      aria-label="자료를 불러오고 있습니다"
      className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 pb-32 pt-8">
      <Skeleton className="h-8 w-40" />
      <div aria-hidden="true" className="flex flex-col gap-6">
        {[0, 1, 2].map((key) => (
          <div key={key} className="flex flex-col gap-4 rounded-lg border p-5">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ))}
      </div>
      <span className="sr-only">자료를 불러오고 있습니다.</span>
    </section>
  );
}
