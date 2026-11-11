import type { RagRepresentative, RagSource } from '@/lib/rag';
import { getPartyColor } from '@/constants/party';

export type AnswerFocus =
  | { kind: 'member'; representative: RagRepresentative; count: number }
  | { kind: 'party'; representative: RagRepresentative; count: number };

/**
 * 법안 카드와 같은 규칙으로 답변의 포인트 색을 정한다.
 * 모든 근거가 같은 정당의 단독 대표발의면 그 정당색, 아니면 중립색이다.
 */
export function answerAccent(sources: RagSource[]) {
  const parties = new Set(sources.map((source) => source.representative?.party ?? null));
  const [party] = parties;
  const shared = sources.length > 0 && parties.size === 1 && party ? party : null;
  return { party: shared, color: getPartyColor(shared) };
}

/** 근거가 모두 한 의원이면 의원 카드, 모두 한 정당이면 정당 카드를 둔다. */
export function answerFocus(sources: RagSource[]): AnswerFocus | null {
  const people = sources.map((source) => source.representative);
  if (!people.length || people.some((item) => !item)) return null;
  const [first] = people as RagRepresentative[];
  if (people.every((item) => item!.congressman_id === first.congressman_id))
    return { kind: 'member', representative: first, count: people.length };
  if (first.party && people.every((item) => item!.party === first.party))
    return { kind: 'party', representative: first, count: people.length };
  return null;
}

/** 모두의입법 무지개 시그니처. 검색 입구 테두리와 같은 네 색이다. */
export const RAINBOW = ['#FC56D8', '#10D9EF', '#FBEB59', '#6CF880'] as const;

export type PartyShare = { party: string | null; color: string; count: number };

/** 근거 법안의 대표발의 정당 분포. 단독 대표발의가 아니면 중립(party=null)으로 센다. 많은 순. */
export function partyShares(sources: RagSource[]): PartyShare[] {
  const counts = new Map<string | null, number>();
  sources.forEach((source) => {
    const party = source.representative?.party ?? null;
    counts.set(party, (counts.get(party) ?? 0) + 1);
  });
  return [...counts.entries()]
    .map(([party, count]) => ({ party, color: getPartyColor(party), count }))
    .sort((a, b) => b.count - a.count || (a.party === null ? 1 : 0) - (b.party === null ? 1 : 0));
}

const RING_GAP = 6;
/** 다크 모드에서 남색처럼 짙은 정당색이 배경에 묻히지 않게 흰색과 섞는다(--answer-ring-tone, 라이트는 100%). */
const tone = (color: string) => `color-mix(in srgb, ${color} var(--answer-ring-tone, 100%), #fff)`;

/**
 * 답변 링의 정당 호. 건수 비율이 호의 길이이고, 색은 섞지 않고 호마다 한 정당색을 쓴다.
 * 정당이 둘 이상이면 호 사이에 틈을 둔다. 근거가 없으면 중립 회색 링이다.
 */
export function ringGradient(shares: PartyShare[]) {
  if (!shares.length) return tone(getPartyColor(null));
  if (shares.length === 1) return tone(shares[0].color);
  const total = shares.reduce((sum, share) => sum + share.count, 0);
  const usable = 360 - RING_GAP * shares.length;
  let at = 0;
  const stops = shares.flatMap(({ color, count }) => {
    const start = at;
    const end = start + (count / total) * usable;
    at = end + RING_GAP;
    const deg = (value: number) => `${Number(value.toFixed(2))}deg`;
    return [`${tone(color)} ${deg(start)} ${deg(end)}`, `transparent ${deg(end)} ${deg(at)}`];
  });
  return `conic-gradient(${stops.join(', ')})`;
}
