function normalize(value?: string | null) {
  return value?.normalize('NFC').trim().replace(/\s+/gu, ' ') ?? '';
}

export function billHeadline(billName: string, generatedTitle?: string | null) {
  const official = normalize(billName);
  const title = normalize(generatedTitle)
    .replace(/[.。]$/u, '')
    .trimEnd();
  if (!title || title === official) return official;

  const suffix = ` ${official}`;
  if (official && title.endsWith(suffix)) {
    const prefix = title.slice(0, -suffix.length);
    const change = prefix.replace(/[을를]?\s+위한$/u, '').trimEnd();
    if (change && change !== prefix) return change;
  }
  return title;
}
