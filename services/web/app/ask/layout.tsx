import type { Metadata } from 'next';
import { Layout } from '@/components';

export const metadata: Metadata = {
  title: '법안 검색과 질문',
  description: '관심 주제로 법안을 검색하고 AI와 대화하며 원문과 출처를 확인하세요.',
  robots: { index: false, follow: true },
};

export default function AskLayout({ children }: { children: React.ReactNode }) {
  return (
    <Layout logo search theme>
      {children}
    </Layout>
  );
}
