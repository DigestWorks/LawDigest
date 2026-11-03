import { siteConfig } from '@/config/site';

const ORIGIN = (process.env.INTERNAL_API_ORIGIN ?? 'https://api.lawdigest.kr').replace(/\/+$/, '');
const NS = 'http://www.sitemaps.org/schemas/sitemap/0.9';

export const sitemapKinds = {
  bills: '/bill',
  reports: '/report',
  congressmen: '/congressman',
  parties: '/party',
} as const;
export type SitemapKind = keyof typeof sitemapKinds;

export function isSitemapKind(kind: string): kind is SitemapKind {
  return Object.hasOwn(sitemapKinds, kind);
}

export const sitemapPaths = ['/', '/explore', '/timeline', '/about'];

function location(path: string) {
  return new URL(path, siteConfig.url).href.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

export function xmlResponse(kind: 'urlset' | 'sitemapindex', paths: string[]) {
  const tag = kind === 'urlset' ? 'url' : 'sitemap';
  const items = paths.map((path) => `<${tag}><loc>${location(path)}</loc></${tag}>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><${kind} xmlns="${NS}">${items}</${kind}>`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
  });
}

export async function fetchSitemapData<T>(path = ''): Promise<T> {
  const response = await fetch(`${ORIGIN}/v1/discovery/sitemap${path}`, {
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('Sitemap API unavailable');
  const payload = await response.json();
  if (payload.code !== 200 || !payload.data) throw new Error('Invalid sitemap response');
  return payload.data as T;
}
