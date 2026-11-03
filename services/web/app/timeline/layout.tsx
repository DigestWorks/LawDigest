import { Layout } from '@/components';
import getMetadata from '@/utils/getMetadata';

export const metadata = getMetadata({
  title: '타임라인',
  description: '날짜별 국회 법안 접수, 위원회 심사, 본회의 심의와 공포 기록을 확인합니다.',
  asPath: '/timeline',
});

export default function TimelineLayout({ children }: { children: React.ReactNode }) {
  return (
    <Layout nav logo notification>
      {children}
    </Layout>
  );
}
