function normalize(value?: string | null) {
  return value?.normalize('NFC').trim().replace(/\s+/gu, ' ') ?? '';
}

// 카드 제목 계약은 '[대상·바뀌는 내용·목적]하기 위한 법안'이다.
// 2026-11-08 이전에 저장된 '[변경 내용]을 위한 [정식 법안명]' 제목은 끝의 정식명을 '법안'으로 바꿔 같은 형태로 보여 준다.
export function billHeadline(billName: string, generatedTitle?: string | null) {
  const official = normalize(billName);
  const title = normalize(generatedTitle)
    .replace(/[.。]$/u, '')
    .trimEnd();
  if (!title || title === official) return official;

  const suffix = ` ${official}`;
  if (official && title.endsWith(suffix)) {
    const prefix = title.slice(0, -suffix.length).trimEnd();
    if (prefix.endsWith(' 위한')) return `${prefix} 법안`;
  }
  return title;
}
