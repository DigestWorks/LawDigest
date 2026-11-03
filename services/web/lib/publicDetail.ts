import { cache } from 'react';
import { notFound } from 'next/navigation';
import type { BaseResponse, BillResponse, CongressmanDetailResponse, PartyDetailResponse } from '@/types';

export const publicDetailError = '자료를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';

// 공개 상세 조회에서는 인증 인터셉터와 사용자 쿠키를 사용하지 않는다.
// 네트워크 오류 객체·접속 URL·응답 원문이 RSC 오류로 전달되지 않도록 경계를 둔다.
export async function fetchPublicDetail<T>(path: string): Promise<BaseResponse<T>> {
  const origin = (process.env.INTERNAL_API_ORIGIN ?? process.env.NEXT_PUBLIC_URL ?? 'https://api.lawdigest.kr').replace(
    /\/+$/,
    '',
  );
  let response: Response;
  try {
    response = await fetch(`${origin}/v1${path}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
      headers: { Accept: 'application/json' },
    });
  } catch {
    throw new Error(publicDetailError);
  }
  if (response.status === 404 || response.status === 400) notFound();
  if (!response.ok) throw new Error(publicDetailError);
  try {
    const result = await response.json();
    if (!result || result.code !== 200 || !result.data || typeof result.data !== 'object') {
      throw new Error(publicDetailError);
    }
    return result;
  } catch {
    throw new Error(publicDetailError);
  }
}

export function validPublicId(id: string) {
  return /^[A-Za-z0-9_-]{1,100}$/.test(id);
}

export const getPublicBill = cache((id: string) => {
  if (!validPublicId(id)) notFound();
  return fetchPublicDetail<BillResponse>(`/bill/detail/${encodeURIComponent(id)}?current_assembly=true`);
});
export const getPublicCongressman = cache((id: string) => {
  if (!validPublicId(id)) notFound();
  return fetchPublicDetail<CongressmanDetailResponse>(`/congressman/detail?congressman_id=${encodeURIComponent(id)}`);
});
export const getPublicParty = cache((id: string) => {
  const partyId = Number(id);
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(partyId) || partyId <= 0) notFound();
  return fetchPublicDetail<PartyDetailResponse>(`/party/detail?party_id=${partyId}`);
});
