import { Metadata } from 'next';
import { siteConfig } from '@/config/site';

type getMetadataProps = {
  title: string;
  description: string;
  asPath: string;
  noIndex?: boolean;
};

export default function getMetadata(metadataProps?: getMetadataProps) {
  const { title, description, asPath, noIndex } = metadataProps || {};

  const TITLE = title ? `${title} | ${siteConfig.title}` : siteConfig.title;
  const DESCRIPTION = description || siteConfig.description;
  const PAGE_URL = asPath || '/';
  const shareImage = {
    url: siteConfig.ogImage,
    alt: `${siteConfig.title} 로고`,
    type: 'image/png',
    width: 4800,
    height: 2520,
  };

  const metadata: Metadata = {
    metadataBase: new URL(siteConfig.url),
    alternates: {
      canonical: PAGE_URL,
    },
    title: { absolute: TITLE },
    description: DESCRIPTION,
    ...(noIndex ? { robots: { index: false, follow: true } } : {}),
    keywords: [...siteConfig.keywords],
    icons: {
      icon: '/images/favicon.ico',
      shortcut: '/images/favicon-16x16.png',
      apple: '/images/apple-icon-180x180.png',
    },
    verification: {
      google: siteConfig.verification.google,
      other: {
        'naver-site-verification': siteConfig.verification.naver,
      },
    },
    openGraph: {
      siteName: siteConfig.title,
      title: TITLE,
      description: DESCRIPTION,
      type: siteConfig.type,
      locale: 'ko_KR',
      url: PAGE_URL,
      images: shareImage,
    },
    twitter: {
      title: TITLE,
      description: DESCRIPTION,
      images: shareImage,
    },
  };

  return metadata;
}
