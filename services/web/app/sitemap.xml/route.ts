import { fetchSitemapData, sitemapKinds, xmlResponse } from '@/lib/sitemap';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const index = await fetchSitemapData<{ page_size: number; counts: Record<string, number> }>();
    if (!Number.isInteger(index.page_size) || index.page_size <= 0) throw new Error('Invalid sitemap page size');
    const paths = ['/sitemap-pages-0.xml'];
    for (const kind of Object.keys(sitemapKinds)) {
      const count = index.counts[kind];
      if (!Number.isSafeInteger(count) || count < 0) throw new Error('Invalid sitemap count');
      const pages = Math.ceil(count / index.page_size);
      if (pages > 1001) throw new Error('Sitemap page limit exceeded');
      for (let page = 0; page < pages; page += 1) {
        paths.push(`/sitemap-${kind}-${page}.xml`);
      }
    }
    return xmlResponse('sitemapindex', paths);
  } catch {
    return new Response(null, { status: 503 });
  }
}
