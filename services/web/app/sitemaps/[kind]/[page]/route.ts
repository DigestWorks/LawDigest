import { fetchSitemapData, isSitemapKind, sitemapKinds, sitemapPaths, xmlResponse } from '@/lib/sitemap';

export async function GET(_: Request, { params }: { params: Promise<{ kind: string; page: string }> }) {
  const { kind, page } = await params;
  if (kind === 'pages' && page === '0') return xmlResponse('urlset', sitemapPaths);
  if (!isSitemapKind(kind) || !/^(0|[1-9]\d{0,3})$/.test(page) || Number(page) > 1000) {
    return new Response(null, { status: 404 });
  }
  try {
    const ids = await fetchSitemapData<string[]>(`/${kind}?page=${page}`);
    if (!Array.isArray(ids)) throw new Error('Invalid sitemap IDs');
    const paths = ids
      .filter((id) => typeof id === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(id))
      .map((id) => `${sitemapKinds[kind]}/${encodeURIComponent(id)}`);
    return paths.length ? xmlResponse('urlset', paths) : new Response(null, { status: 404 });
  } catch {
    return new Response(null, { status: 503 });
  }
}
