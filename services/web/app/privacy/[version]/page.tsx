import { notFound } from 'next/navigation';
import { Layout } from '@/components';
import LegalDocument from '@/components/Legal/LegalDocument';
import { PRIVACY_DOCUMENT } from '@/constants/legal';
import { archivedVersions, getArchivedDocument } from '@/constants/legalArchive';
import getMetadata from '@/utils/getMetadata';

type Params = { params: Promise<{ version: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return archivedVersions('privacy').map((version) => ({ version }));
}

export async function generateMetadata({ params }: Params) {
  const { version } = await params;
  const document = getArchivedDocument('privacy', version);
  return getMetadata({
    title: `${PRIVACY_DOCUMENT.title}(${document?.effectiveDate ?? version} 시행)`,
    description: PRIVACY_DOCUMENT.description,
    asPath: `${PRIVACY_DOCUMENT.path}/${version}`,
    noIndex: true,
  });
}

export default async function ArchivedPrivacyPage({ params }: Params) {
  const { version } = await params;
  const document = getArchivedDocument('privacy', version);
  if (!document) notFound();

  return (
    <Layout nav logo notification>
      <LegalDocument document={document} current={PRIVACY_DOCUMENT} />
    </Layout>
  );
}
