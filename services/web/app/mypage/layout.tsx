import { Layout } from '@/components';
import getMetadata from '@/utils/getMetadata';

export const metadata = getMetadata({
  title: '마이페이지',
  description: '스크랩과 팔로우, 계정 정보를 확인합니다.',
  asPath: '/mypage',
  noIndex: true,
});

export default function MypageLayout({ children }: { children: React.ReactNode }) {
  return (
    <Layout nav logo notification>
      {children}
    </Layout>
  );
}
