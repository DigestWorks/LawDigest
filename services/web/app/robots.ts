import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/mypage', '/notification', '/login', '/following'] },
    sitemap: new URL('/sitemap.xml', siteConfig.url).href,
  };
}
