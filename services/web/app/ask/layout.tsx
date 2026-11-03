import type { Metadata } from 'next';
import { Layout } from '@/components';

export const metadata: Metadata = {
  title: '법안에 질문하기 | 모두의입법',
  description: '국회 법안 원문을 근거로 질문하고 출처를 확인하세요.',
  robots: { index: false, follow: true },
};

export default function AskLayout({ children }: { children: React.ReactNode }) {
  return (
    <Layout logo search theme>
      {children}
    </Layout>
  );
}
