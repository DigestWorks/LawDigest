import { Layout } from '@/components';
import getMetadata from '@/utils/getMetadata';

export const metadata = getMetadata({
  title: '팔로잉',
  description: '팔로우한 의원과 정당의 법안과 활동을 확인합니다.',
  asPath: '/following',
  noIndex: true,
});

export default function FollowingLayout({ children }: { children: React.ReactNode }) {
  return (
    <Layout nav logo notification>
      {children}
    </Layout>
  );
}
