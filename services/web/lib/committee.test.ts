import { describe, expect, it } from 'vitest';
import { committeeHref, decodeCommitteeParam, isCommitteeName } from './committee';

describe('committee route helpers', () => {
  it('round-trips names with spaces and dots', () => {
    for (const name of [
      '보건복지위원회',
      '기후위기 특별위원회',
      '12.29여객기참사진상규명과피해자및유가족의피해구제를위한특별위원회',
    ]) {
      const segment = committeeHref(name).replace('/committee/', '');
      expect(decodeCommitteeParam(segment)).toBe(name);
      expect(decodeCommitteeParam(name)).toBe(name);
    }
  });

  it('rejects malformed or empty segments', () => {
    expect(decodeCommitteeParam('%E0%A4%A')).toBeNull();
    expect(decodeCommitteeParam('%20')).toBeNull();
    expect(decodeCommitteeParam('가'.repeat(101))).toBeNull();
  });

  it('treats stage markers as non-committees', () => {
    expect(isCommitteeName('보건복지위원회')).toBe(true);
    expect(isCommitteeName('-')).toBe(false);
    expect(isCommitteeName('본회의')).toBe(false);
    expect(isCommitteeName(null)).toBe(false);
  });
});
