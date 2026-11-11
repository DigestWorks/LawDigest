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

/** 두 hex 색을 ratio(0~1)만큼 target 쪽으로 섞는다. 같은 정당색의 톤을 만들 때만 쓴다. */
function mixHex(color: string, target: string, ratio: number) {
  const channels = (hex: string) => [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
  const from = channels(color);
  const to = channels(target);
  return `#${from
    .map((value, index) =>
      Math.round(value + (to[index] - value) * ratio)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

/** 모두의입법 무지개 시그니처. 검색 입구 테두리와 같은 네 색이다. */
export const RAINBOW = ['#FC56D8', '#10D9EF', '#FBEB59', '#6CF880'] as const;
export const ORB_LAYER_COUNT = 7;

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

/**
 * 구체의 7겹 색. 섞지 않고 겹마다 한 정당색을 맡겨 색 덩어리가 공존하게 한다.
 * 겹 수는 건수 비율로 나누고(있는 정당은 최소 1겹), 같은 색이 몰리지 않게 가중 라운드로빈으로 번갈아 놓는다.
 * 근거가 없으면(답을 만드는 중) 무지개 네 색을 돌려 쓴다.
 */
export function orbLayers(sources: RagSource[]): string[] {
  const shares = partyShares(sources).slice(0, ORB_LAYER_COUNT);
  if (!shares.length) return Array.from({ length: ORB_LAYER_COUNT }, (_, index) => RAINBOW[index % RAINBOW.length]);
  // 한 정당뿐이면 일곱 겹이 같은 색이라 평평한 원판이 된다. 같은 정당색의 밝은·짙은 톤을 번갈아 써서 덩어리가 보이게 한다.
  if (shares.length === 1) {
    const [{ color }] = shares;
    const light = mixHex(color, '#ffffff', 0.42);
    const deep = mixHex(color, '#000000', 0.22);
    return [color, light, color, deep, light, color, deep];
  }
  const total = shares.reduce((sum, share) => sum + share.count, 0);
  // 최대잉여 배분: 7겹을 비율대로 나누고 남는 겹은 소수점이 큰 정당부터 준다.
  const exact = shares.map((share) => (share.count / total) * ORB_LAYER_COUNT);
  const layers = exact.map(Math.floor);
  const order = exact
    .map((value, index) => ({ index, rest: value - Math.floor(value) }))
    .sort((a, b) => b.rest - a.rest);
  for (let left = ORB_LAYER_COUNT - layers.reduce((sum, n) => sum + n, 0), i = 0; left > 0; left -= 1, i += 1)
    layers[order[i % order.length].index] += 1;
  // 0겹이 된 정당은 가장 많은 정당에게서 한 겹을 받는다.
  layers.forEach((count, index) => {
    if (count > 0) return;
    layers[layers.indexOf(Math.max(...layers))] -= 1;
    layers[index] = 1;
  });
  // 가중 라운드로빈: 많은 정당이 먼저 오되 같은 색이 연달아 놓이지 않는다.
  const current = layers.map(() => 0);
  return Array.from({ length: ORB_LAYER_COUNT }, () => {
    layers.forEach((weight, index) => {
      current[index] += weight;
    });
    const pick = current.indexOf(Math.max(...current));
    current[pick] -= ORB_LAYER_COUNT;
    return shares[pick].color;
  });
}
