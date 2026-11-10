import { ragProxy } from '@/lib/ragProxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  return ragProxy(request, fetch, 'search');
}
