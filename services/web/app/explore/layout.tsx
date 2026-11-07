import { Layout } from '@/components';
import getMetadata from '@/utils/getMetadata';

export const metadata = getMetadata({
  title: '탐색',
  description: '분야별 법안과 국회 의석, 입법 통계를 확인합니다.',
  asPath: '/explore',
});

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return (
    <Layout nav logo notification>
      {children}
    </Layout>
  );
}
