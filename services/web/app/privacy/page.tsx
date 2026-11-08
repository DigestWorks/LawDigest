import { Layout } from '@/components';
import LegalDocument from '@/components/Legal/LegalDocument';
import { PRIVACY_DOCUMENT } from '@/constants/legal';
import getMetadata from '@/utils/getMetadata';

export const metadata = getMetadata({
  title: PRIVACY_DOCUMENT.title,
  description: PRIVACY_DOCUMENT.description,
  asPath: PRIVACY_DOCUMENT.path,
});

export default function PrivacyPage() {
  return (
    <Layout nav logo notification>
      <LegalDocument document={PRIVACY_DOCUMENT} />
    </Layout>
  );
}
