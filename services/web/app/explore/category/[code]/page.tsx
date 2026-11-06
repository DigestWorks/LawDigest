import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { getCategoryMeta, isCategoryCode } from '@/config/categories';
import getMetadata from '@/utils/getMetadata';
import CategoryBills from '../../components/CategoryBills';

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props) {
  const { code } = await params;
  if (!isCategoryCode(code)) notFound();
  const { label } = getCategoryMeta(code);
  return getMetadata({
    title: `${label} 분야 법안`,
    description: `제22대 국회의 ${label} 분야 법안을 확인합니다.`,
    asPath: `/explore/category/${code}`,
  });
}

export default async function CategoryPage({ params }: Props) {
  const { code } = await params;
  if (!isCategoryCode(code)) notFound();
  const { icon: Icon, color, label } = getCategoryMeta(code);
  return (
    <section className="mx-auto min-w-0 w-full max-w-[900px] space-y-4 px-5 py-6" aria-labelledby="category-heading">
      <Button asChild variant="outline">
        <Link href="/explore">전체 분야</Link>
      </Button>
      <h1 id="category-heading" className="flex items-center gap-2 text-2xl font-bold">
        <Icon aria-hidden="true" className="size-6 shrink-0" style={{ color }} />
        {label} 분야 법안
      </h1>
      <CategoryBills category={code} />
    </section>
  );
}
