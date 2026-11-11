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

const PARTY_ALIASES: Record<string, string[]> = { 더불어민주당: ['민주당'], 국민의힘: ['국힘'] };

/**
 * 근거가 모두 한 의원이면 의원 카드, 모두 한 정당이면 정당 카드를 둔다.
 * 질문이 그 의원이나 정당을 직접 부를 때만 둔다. 근거가 우연히 한 정당뿐인 주제 검색에 정당 카드를 띄우지 않는다.
 */
export function answerFocus(sources: RagSource[], question = ''): AnswerFocus | null {
  const focus = sharedFocus(sources);
  if (!focus) return null;
  const text = question.replace(/\s+/g, '');
  const { name, party } = focus.representative;
  if (focus.kind === 'member') return text.includes(name) ? focus : null;
  const names = party ? [party, ...(PARTY_ALIASES[party] ?? [])] : [];
  return names.some((item) => text.includes(item)) ? focus : null;
}

function sharedFocus(sources: RagSource[]): AnswerFocus | null {
  const people = sources.map((source) => source.representative);
  if (!people.length || people.some((item) => !item)) return null;
  const [first] = people as RagRepresentative[];
  if (people.every((item) => item!.congressman_id === first.congressman_id))
    return { kind: 'member', representative: first, count: people.length };
  if (first.party && people.every((item) => item!.party === first.party))
    return { kind: 'party', representative: first, count: people.length };
  return null;
}
