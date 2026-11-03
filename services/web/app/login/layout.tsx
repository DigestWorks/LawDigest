import getMetadata from '@/utils/getMetadata';
import { Layout } from '@/components';

export const metadata = getMetadata({
  title: '로그인',
  description: '소셜 계정으로 로그인해 법안 스크랩과 팔로우를 이용합니다.',
  asPath: '/login',
  noIndex: true,
});

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <Layout nav theme goBack>
      {children}
    </Layout>
  );
}
