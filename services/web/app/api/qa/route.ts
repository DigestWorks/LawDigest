import { ragProxy } from '@/lib/ragProxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return ragProxy(request);
}
export async function POST(request: Request) {
  return ragProxy(request);
}
