import { Layout } from '@/components';
import LegalDocument from '@/components/Legal/LegalDocument';
import { TERMS_DOCUMENT } from '@/constants/legal';
import getMetadata from '@/utils/getMetadata';

export const metadata = getMetadata({
  title: TERMS_DOCUMENT.title,
  description: TERMS_DOCUMENT.description,
  asPath: TERMS_DOCUMENT.path,
});

export default function TermsPage() {
  return (
    <Layout nav logo notification>
      <LegalDocument document={TERMS_DOCUMENT} />
    </Layout>
  );
}
