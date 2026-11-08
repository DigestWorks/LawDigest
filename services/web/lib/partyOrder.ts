/** 무소속은 정당이 아니므로 정당을 나열하는 목록에서 항상 맨 뒤에 둔다. */
export const INDEPENDENT_PARTY_NAME = '무소속';

export function isIndependent(partyName: string | null | undefined): boolean {
  return partyName?.trim() === INDEPENDENT_PARTY_NAME;
}

/** 무소속을 맨 뒤로 보내고, 나머지는 `count`가 큰 순으로 정렬한 새 배열을 돌려준다. */
export function sortPartiesIndependentLast<T>(
  parties: readonly T[],
  name: (party: T) => string | null | undefined,
  count: (party: T) => number,
): T[] {
  return [...parties].sort(
    (a, b) => Number(isIndependent(name(a))) - Number(isIndependent(name(b))) || count(b) - count(a),
  );
}
