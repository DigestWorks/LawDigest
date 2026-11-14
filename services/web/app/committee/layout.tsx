import { Layout } from '@/components';

export default function CommitteeLayout({ children }: { children: React.ReactNode }) {
  return (
    <Layout nav goBack search title="위원회">
      {children}
    </Layout>
  );
}
