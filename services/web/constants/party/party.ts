export const PARTY_NAME_EN = {
  더불어민주당: 'Democratic Party of Korea',
  국민의힘: 'People Power Party',
  더불어민주연합: 'Democratic Party of Korea Alliance',
  국민의미래: 'People Future Party',
  녹새정의당: 'Green Justice Party',
  새로운미래: 'New Future Party',
  개혁신당: 'Reform Party',
  자유통일당: 'Liberty Unification Party',
  진보당: 'The Progressive Party',
  조국혁신당: 'Rebuilding Korea Party',
};

export const PARTY_NAME_KO = {
  더불어민주당: '더불어민주당',
  국민의힘: '국민의힘',
  더불어민주연합: '더불어민주연합',
  국민의미래: '국민의미래',
  녹새정의당: '녹새정의당',
  새로운미래: '새로운미래',
  개혁신당: '개혁신당',
  자유통일당: '자유통일당',
  진보당: '진보당',
  조국혁신당: '조국혁신당',
} as const;

export const PARTY_COLOR = {
  더불어민주당: '#152484',
  국민의힘: '#E61E2B',
  더불어민주연합: '#152484',
  국민의미래: '#E4002B',
  정의당: '#FFED00',
  기본소득당: '#00D2C3',
  시대전환: '#5B157F',
  녹새정의당: '#007C36',
  녹색정의당: '#007C36',
  새로운미래: '#45BABD',
  개혁신당: '#FF7210',
  자유통일당: '#0958A7',
  진보당: '#D6001C',
  조국혁신당: '#0073CF',
  한국의희망: '#004B83',
  사회민주당: '#F58400',
  무소속: '#797C85',
} as const;

export const UNKNOWN_PARTY_COLOR = '#797C85';

const PARTY_COLOR_ALIAS: Record<string, keyof typeof PARTY_COLOR> = {
  민주: '더불어민주당',
  국힘: '국민의힘',
};

export function getPartyColor(partyName: string | null | undefined): string {
  if (!partyName) {
    return UNKNOWN_PARTY_COLOR;
  }

  const trimmedPartyName = partyName.trim();
  if (!trimmedPartyName) {
    return UNKNOWN_PARTY_COLOR;
  }

  const normalizedPartyName = PARTY_COLOR_ALIAS[trimmedPartyName] ?? trimmedPartyName;
  const matched = Object.entries(PARTY_COLOR).find(
    ([key]) => normalizedPartyName.includes(key) || key.includes(normalizedPartyName),
  );

  return matched?.[1] ?? UNKNOWN_PARTY_COLOR;
}
