import { Layout } from '@/components';

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return (
    <Layout nav goBack theme>
      {children}
    </Layout>
  );
}
