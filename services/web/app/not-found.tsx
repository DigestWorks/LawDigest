import type { Metadata } from 'next';
import { Layout } from '@/components';
import RecoveryState from '@/components/common/RecoveryState';

export const metadata: Metadata = {
  title: '페이지를 찾을 수 없습니다 | 모두의입법',
  description: '주소를 확인하거나 피드에서 다른 법안을 찾아보세요.',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <Layout logo search>
      <RecoveryState kind="not-found" />
    </Layout>
  );
}
