import { Layout } from '@/components';
import getMetadata from '@/utils/getMetadata';

export const metadata = getMetadata({
  title: '알림',
  description: '팔로우한 의원과 법안의 새 소식을 확인합니다.',
  asPath: '/notification',
  noIndex: true,
});

export default function NotificationLayout({ children }: { children: React.ReactNode }) {
  return (
    <Layout goBack theme nav title="알림">
      {children}
    </Layout>
  );
}
