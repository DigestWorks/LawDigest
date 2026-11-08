import TrendingKeywords from './TrendingKeywords';
import CategoryGrid from './CategoryGrid';

export default function FieldPanel() {
  return (
    <div className="flex flex-col gap-7">
      <TrendingKeywords />
      <section className="flex flex-col gap-3">
        <h2 className="text-[15px] font-bold text-primary-3 dark:text-gray-0.5">제22대 분야별 둘러보기</h2>
        <CategoryGrid />
      </section>
    </div>
  );
}
