/** 위원회 상세 경로. 위원회는 별도 id가 없어 이름을 그대로 경로 키로 쓴다. */
export const committeeHref = (name: string) => `/committee/${encodeURIComponent(name)}`;

/**
 * 동적 세그먼트 값을 위원회 이름으로 되돌린다.
 * Next가 퍼센트 인코딩을 남긴 채 넘기는 경우가 있어 한 번 디코드하고, 잘못된 인코딩은 null로 돌려준다.
 */
export function decodeCommitteeParam(raw: string): string | null {
  let name = raw;
  if (/%[0-9A-Fa-f]{2}/.test(raw)) {
    try {
      name = decodeURIComponent(raw);
    } catch {
      return null;
    }
  }
  name = name.trim();
  return name.length > 0 && name.length <= 100 ? name : null;
}

/** 법안의 소관 위원회 값 중 위원회 화면이 있는 이름인지. '-'와 '본회의'는 위원회가 아니다. */
export const isCommitteeName = (name: string | null | undefined): name is string =>
  Boolean(name && name.trim() && name.trim() !== '-' && name.trim() !== '본회의');
