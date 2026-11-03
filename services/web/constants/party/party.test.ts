import { describe, expect, it } from 'vitest';
import { getPartyColor, PARTY_COLOR, UNKNOWN_PARTY_COLOR } from './party';

describe('getPartyColor', () => {
  it('returns the canonical party color for exact and partial party names', () => {
    expect(getPartyColor('더불어민주당')).toBe(PARTY_COLOR.더불어민주당);
    expect(getPartyColor('더불어민주연합')).toBe(PARTY_COLOR.더불어민주연합);
    expect(getPartyColor('자유통일당')).toBe(PARTY_COLOR.자유통일당);
    expect(getPartyColor('국민의힘 후보')).toBe(PARTY_COLOR.국민의힘);
    expect(getPartyColor('녹색정의당')).toBe(PARTY_COLOR.녹색정의당);
    expect(getPartyColor('녹색정의당 후보')).toBe(PARTY_COLOR.녹색정의당);
    expect(getPartyColor('정의당')).toBe(PARTY_COLOR.정의당);
    expect(getPartyColor('조국')).toBe(PARTY_COLOR.조국혁신당);
  });

  it('maps common election shorthand labels to canonical party colors', () => {
    expect(getPartyColor('민주')).toBe(PARTY_COLOR.더불어민주당);
    expect(getPartyColor('국힘')).toBe(PARTY_COLOR.국민의힘);
  });

  it('uses the neutral fallback for unknown or empty party names', () => {
    expect(getPartyColor('알 수 없음')).toBe(UNKNOWN_PARTY_COLOR);
    expect(getPartyColor(null)).toBe(UNKNOWN_PARTY_COLOR);
    expect(getPartyColor('   ')).toBe(UNKNOWN_PARTY_COLOR);
  });
});
