import { Skeleton } from '@/components/ui/skeleton';
import { SearchBillRowSkeleton } from './components/SearchBillList';

/** 결과 화면과 같은 배치의 로딩 화면. 검색 중 표시는 헤더·하단 바의 검색창이 맡는다. */
export default function SearchLoading() {
  return (
    <section
      role="status"
      aria-label="검색 결과를 불러오고 있습니다"
      className="mx-auto w-full max-w-[720px] pt-4 md:pt-6">
      <div className="flex gap-1 px-4 md:px-3" aria-hidden="true">
        {['w-14', 'w-16', 'w-14', 'w-14'].map((width, index) => (
          <Skeleton key={index} className={`h-9 rounded-full ${width}`} />
        ))}
      </div>
      <div className="px-5 pb-1 pt-6 md:px-4" aria-hidden="true">
        <Skeleton className="h-5 w-12" />
      </div>
      <div className="animate-fade-in">
        {[0, 1, 2, 3, 4, 5].map((key) => (
          <SearchBillRowSkeleton key={key} />
        ))}
      </div>
    </section>
  );
}
