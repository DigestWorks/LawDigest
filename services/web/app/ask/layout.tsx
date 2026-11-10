import type { Metadata } from 'next';
import { Layout } from '@/components';

export const metadata: Metadata = {
  title: '법안 AI 채팅',
  description: '법안에 관해 AI에게 묻고, 근거가 된 법안 원문을 확인하세요.',
  robots: { index: false, follow: true },
};

export default function AskLayout({ children }: { children: React.ReactNode }) {
  return (
    <Layout logo search theme>
      {children}
    </Layout>
  );
}
