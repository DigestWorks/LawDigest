import { notFound } from 'next/navigation';
import { Layout } from '@/components';
import LegalDocument from '@/components/Legal/LegalDocument';
import { TERMS_DOCUMENT } from '@/constants/legal';
import { archivedVersions, getArchivedDocument } from '@/constants/legalArchive';
import getMetadata from '@/utils/getMetadata';

type Params = { params: Promise<{ version: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return archivedVersions('terms').map((version) => ({ version }));
}

export async function generateMetadata({ params }: Params) {
  const { version } = await params;
  const document = getArchivedDocument('terms', version);
  return getMetadata({
    title: `${TERMS_DOCUMENT.title}(${document?.effectiveDate ?? version} 시행)`,
    description: TERMS_DOCUMENT.description,
    asPath: `${TERMS_DOCUMENT.path}/${version}`,
    noIndex: true,
  });
}

export default async function ArchivedTermsPage({ params }: Params) {
  const { version } = await params;
  const document = getArchivedDocument('terms', version);
  if (!document) notFound();

  return (
    <Layout nav logo notification>
      <LegalDocument document={document} current={TERMS_DOCUMENT} />
    </Layout>
  );
}
